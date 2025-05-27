-- Add fields for webhook tracking
-- Run this in your Supabase SQL editor

-- Add failure tracking to survey_invitations
ALTER TABLE survey_invitations 
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add index for failed invitations
CREATE INDEX IF NOT EXISTS idx_failed_invitations 
ON survey_invitations(batch_id, failed_at) 
WHERE failed_at IS NOT NULL;

-- Update the update_batch_stats function to include failed count
CREATE OR REPLACE FUNCTION update_batch_stats(batch_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE invitation_batches
  SET 
    sent_count = (
      SELECT COUNT(*) FROM survey_invitations 
      WHERE batch_id = batch_uuid AND sent_at IS NOT NULL
    ),
    opened_count = (
      SELECT COUNT(*) FROM survey_invitations 
      WHERE batch_id = batch_uuid AND opened_at IS NOT NULL
    ),
    completed_count = (
      SELECT COUNT(*) FROM survey_invitations 
      WHERE batch_id = batch_uuid AND completed_at IS NOT NULL
    )
  WHERE id = batch_uuid;
END;
$$ LANGUAGE plpgsql;

-- Add failed_count column to invitation_batches
ALTER TABLE invitation_batches
ADD COLUMN IF NOT EXISTS failed_count INTEGER NOT NULL DEFAULT 0;

-- Update the function to include failed count
CREATE OR REPLACE FUNCTION update_batch_stats(batch_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE invitation_batches
  SET 
    sent_count = (
      SELECT COUNT(*) FROM survey_invitations 
      WHERE batch_id = batch_uuid AND sent_at IS NOT NULL
    ),
    opened_count = (
      SELECT COUNT(*) FROM survey_invitations 
      WHERE batch_id = batch_uuid AND opened_at IS NOT NULL
    ),
    completed_count = (
      SELECT COUNT(*) FROM survey_invitations 
      WHERE batch_id = batch_uuid AND completed_at IS NOT NULL
    ),
    failed_count = (
      SELECT COUNT(*) FROM survey_invitations 
      WHERE batch_id = batch_uuid AND failed_at IS NOT NULL
    )
  WHERE id = batch_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create a view for detailed invitation status
CREATE OR REPLACE VIEW invitation_status_summary AS
SELECT 
  b.id as batch_id,
  b.name as batch_name,
  COUNT(i.id) as total_invitations,
  COUNT(i.sent_at) as sent,
  COUNT(i.opened_at) as opened,
  COUNT(i.completed_at) as completed,
  COUNT(i.failed_at) as failed,
  COUNT(CASE WHEN i.sent_at IS NULL AND i.failed_at IS NULL THEN 1 END) as pending
FROM invitation_batches b
LEFT JOIN survey_invitations i ON b.id = i.batch_id
GROUP BY b.id, b.name
ORDER BY b.created_at DESC;