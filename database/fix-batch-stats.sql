-- Fix batch statistics by manually calling the update function
-- Run this in Supabase SQL editor to update all batch stats

-- First, let's see what's in the tables
SELECT 
  b.id as batch_id,
  b.name,
  b.sent_count,
  b.opened_count,
  b.completed_count,
  COUNT(CASE WHEN i.sent_at IS NOT NULL THEN 1 END) as actual_sent,
  COUNT(CASE WHEN i.opened_at IS NOT NULL THEN 1 END) as actual_opened,
  COUNT(CASE WHEN i.completed_at IS NOT NULL THEN 1 END) as actual_completed
FROM invitation_batches b
LEFT JOIN survey_invitations i ON b.id = i.batch_id
GROUP BY b.id, b.name, b.sent_count, b.opened_count, b.completed_count;

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

-- Check the results
SELECT 
  b.id as batch_id,
  b.name,
  b.sent_count,
  b.opened_count,
  b.completed_count
FROM invitation_batches b
ORDER BY b.created_at DESC;