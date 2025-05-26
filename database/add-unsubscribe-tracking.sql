-- Add unsubscribe tracking to survey invitations
-- Run this in Supabase SQL editor

-- Add unsubscribed_at column to survey_invitations
ALTER TABLE survey_invitations 
ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_survey_invitations_unsubscribed 
ON survey_invitations(unsubscribed_at);

-- Add unsubscribed_count to invitation_batches
ALTER TABLE invitation_batches 
ADD COLUMN IF NOT EXISTS unsubscribed_count INTEGER DEFAULT 0;

-- Update the batch stats function to include unsubscribed count
CREATE OR REPLACE FUNCTION update_batch_stats(batch_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE invitation_batches
  SET 
    sent_count = (
      SELECT COUNT(DISTINCT id) FROM survey_invitations 
      WHERE batch_id = batch_uuid AND sent_at IS NOT NULL
    ),
    opened_count = (
      SELECT COUNT(DISTINCT id) FROM survey_invitations 
      WHERE batch_id = batch_uuid AND opened_at IS NOT NULL
    ),
    completed_count = (
      SELECT COUNT(DISTINCT id) FROM survey_invitations 
      WHERE batch_id = batch_uuid AND completed_at IS NOT NULL
    ),
    unsubscribed_count = (
      SELECT COUNT(DISTINCT id) FROM survey_invitations 
      WHERE batch_id = batch_uuid AND unsubscribed_at IS NOT NULL
    )
  WHERE id = batch_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle unsubscribe
CREATE OR REPLACE FUNCTION handle_unsubscribe(invitation_token TEXT)
RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  result JSON;
BEGIN
  -- Find the invitation
  SELECT * INTO invitation_record
  FROM survey_invitations
  WHERE token = invitation_token;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid token');
  END IF;
  
  -- Check if already unsubscribed
  IF invitation_record.unsubscribed_at IS NOT NULL THEN
    RETURN json_build_object('success', true, 'message', 'Already unsubscribed');
  END IF;
  
  -- Update the invitation
  UPDATE survey_invitations
  SET unsubscribed_at = NOW()
  WHERE token = invitation_token;
  
  -- Update batch statistics
  PERFORM update_batch_stats(invitation_record.batch_id);
  
  -- Log the event
  INSERT INTO email_events (
    invitation_id,
    event_type,
    event_data,
    created_at
  ) VALUES (
    invitation_record.id,
    'unsubscribed',
    json_build_object('method', 'link'),
    NOW()
  );
  
  RETURN json_build_object('success', true, 'message', 'Successfully unsubscribed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update all existing batch statistics
DO $$
DECLARE
  batch_record RECORD;
BEGIN
  FOR batch_record IN SELECT id FROM invitation_batches
  LOOP
    PERFORM update_batch_stats(batch_record.id);
  END LOOP;
END $$;

-- Verify the schema
SELECT 
  b.id as batch_id,
  b.name,
  b.total_count,
  b.sent_count,
  b.opened_count,
  b.completed_count,
  b.unsubscribed_count,
  COUNT(DISTINCT CASE WHEN i.unsubscribed_at IS NOT NULL THEN i.id END) as actual_unsubscribed
FROM invitation_batches b
LEFT JOIN survey_invitations i ON b.id = i.batch_id
GROUP BY b.id, b.name, b.total_count, b.sent_count, b.opened_count, b.completed_count, b.unsubscribed_count
ORDER BY b.created_at DESC;