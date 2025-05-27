-- Add columns for partial response tracking
ALTER TABLE survey_responses
ADD COLUMN IF NOT EXISTS last_page integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_percentage integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS invitation_token text,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- Add index for finding partial responses
CREATE INDEX IF NOT EXISTS idx_survey_responses_invitation_token 
ON survey_responses(invitation_token) 
WHERE invitation_token IS NOT NULL;

-- Add index for finding incomplete responses
CREATE INDEX IF NOT EXISTS idx_survey_responses_incomplete 
ON survey_responses(survey_id, is_complete) 
WHERE is_complete = false;