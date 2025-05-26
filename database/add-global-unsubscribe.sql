-- Create global unsubscribe list to track emails across all batches
-- Run this in Supabase SQL editor

-- Create table for globally unsubscribed emails
CREATE TABLE IF NOT EXISTS unsubscribed_emails (
  email TEXT PRIMARY KEY,
  unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT, -- 'link', 'manual', 'bounce', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_unsubscribed_emails_created 
ON unsubscribed_emails(created_at);

-- Update the handle_unsubscribe function to add to global list
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
  
  -- Add to global unsubscribe list
  INSERT INTO unsubscribed_emails (email, source)
  VALUES (invitation_record.recipient_email, 'link')
  ON CONFLICT (email) DO NOTHING;
  
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

-- Function to check if email is unsubscribed
CREATE OR REPLACE FUNCTION is_email_unsubscribed(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM unsubscribed_emails 
    WHERE email = LOWER(TRIM(check_email))
  );
END;
$$ LANGUAGE plpgsql;

-- Add any existing unsubscribed emails to the global list
INSERT INTO unsubscribed_emails (email, source, unsubscribed_at)
SELECT DISTINCT 
  LOWER(TRIM(recipient_email)) as email,
  'migration' as source,
  unsubscribed_at
FROM survey_invitations
WHERE unsubscribed_at IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Update invitations to mark as unsubscribed if email is in global list
UPDATE survey_invitations si
SET unsubscribed_at = ue.unsubscribed_at
FROM unsubscribed_emails ue
WHERE LOWER(TRIM(si.recipient_email)) = ue.email
AND si.unsubscribed_at IS NULL;

-- Update all batch statistics
DO $$
DECLARE
  batch_record RECORD;
BEGIN
  FOR batch_record IN SELECT id FROM invitation_batches
  LOOP
    PERFORM update_batch_stats(batch_record.id);
  END LOOP;
END $$;

-- Verify the global unsubscribe list
SELECT COUNT(*) as total_unsubscribed FROM unsubscribed_emails;