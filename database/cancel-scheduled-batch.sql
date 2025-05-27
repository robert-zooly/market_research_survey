-- Find your batch (look for the one with ~5000 recipients)
SELECT id, name, total_count, created_at 
FROM invitation_batches 
ORDER BY created_at DESC;

-- Once you identify the batch ID, choose one option:

-- OPTION 1: Mark as sent (prevents sending but keeps data)
-- Replace 'YOUR_BATCH_ID' with the actual batch ID
UPDATE survey_invitations 
SET sent_at = NOW() 
WHERE batch_id = 'YOUR_BATCH_ID' 
AND sent_at IS NULL;

-- Update the batch statistics
SELECT update_batch_stats('YOUR_BATCH_ID');

-- OPTION 2: Delete the entire batch (removes all data)
-- DELETE FROM invitation_batches WHERE id = 'YOUR_BATCH_ID';

-- OPTION 3: Mark all as unsubscribed (keeps data but prevents sending)
-- UPDATE survey_invitations 
-- SET unsubscribed_at = NOW() 
-- WHERE batch_id = 'YOUR_BATCH_ID' 
-- AND sent_at IS NULL;