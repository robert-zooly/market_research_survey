-- Fix duplicate trigger error and ensure proper batch statistics
-- Run this in Supabase SQL editor

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS link_invitation_trigger ON survey_responses;

-- Recreate the trigger
CREATE TRIGGER link_invitation_trigger
BEFORE INSERT OR UPDATE ON survey_responses
FOR EACH ROW
EXECUTE FUNCTION link_invitation_to_response();

-- Fix the update_batch_stats function to ensure accurate counts
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
    )
  WHERE id = batch_uuid;
END;
$$ LANGUAGE plpgsql;

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

-- Verify the counts
SELECT 
  b.id as batch_id,
  b.name,
  b.total_count,
  b.sent_count,
  b.opened_count,
  b.completed_count,
  COUNT(DISTINCT i.id) as total_invitations,
  COUNT(DISTINCT CASE WHEN i.sent_at IS NOT NULL THEN i.id END) as actual_sent,
  COUNT(DISTINCT CASE WHEN i.opened_at IS NOT NULL THEN i.id END) as actual_opened,
  COUNT(DISTINCT CASE WHEN i.completed_at IS NOT NULL THEN i.id END) as actual_completed
FROM invitation_batches b
LEFT JOIN survey_invitations i ON b.id = i.batch_id
GROUP BY b.id, b.name, b.total_count, b.sent_count, b.opened_count, b.completed_count
ORDER BY b.created_at DESC;