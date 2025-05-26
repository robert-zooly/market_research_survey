-- Survey invitation tracking system
-- Run this in your Supabase SQL editor

-- Create invitation batches table
CREATE TABLE IF NOT EXISTS invitation_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  csv_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create survey invitations table
CREATE TABLE IF NOT EXISTS survey_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  batch_id UUID REFERENCES invitation_batches(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES surveys(id),
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  recipient_state VARCHAR(50),
  recipient_data JSONB, -- Store any additional CSV fields
  timezone VARCHAR(50),
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for survey_invitations
CREATE INDEX IF NOT EXISTS idx_token ON survey_invitations(token);
CREATE INDEX IF NOT EXISTS idx_email ON survey_invitations(recipient_email);
CREATE INDEX IF NOT EXISTS idx_batch_status ON survey_invitations(batch_id, sent_at, completed_at);

-- Create email tracking table
CREATE TABLE IF NOT EXISTS email_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID REFERENCES survey_invitations(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'sent', 'opened', 'clicked', 'bounced', 'complained'
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for email_events
CREATE INDEX IF NOT EXISTS idx_invitation_events ON email_events(invitation_id, event_type);

-- Function to update batch statistics
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

-- Trigger to update survey_responses with invitation link
CREATE OR REPLACE FUNCTION link_invitation_to_response()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record survey_invitations;
BEGIN
  -- Check if response has invitation token in metadata
  IF NEW.response_data ? '_invitation_token' THEN
    -- Find the invitation
    SELECT * INTO invitation_record
    FROM survey_invitations
    WHERE token = NEW.response_data->>'_invitation_token';
    
    IF invitation_record.id IS NOT NULL THEN
      -- Update invitation as completed
      UPDATE survey_invitations
      SET completed_at = NOW()
      WHERE id = invitation_record.id;
      
      -- Update batch stats
      PERFORM update_batch_stats(invitation_record.batch_id);
      
      -- Update response with invitation data
      NEW.respondent_email = COALESCE(NEW.respondent_email, invitation_record.recipient_email);
      NEW.respondent_name = COALESCE(NEW.respondent_name, invitation_record.recipient_name);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on survey_responses
CREATE TRIGGER link_invitation_trigger
BEFORE INSERT OR UPDATE ON survey_responses
FOR EACH ROW
EXECUTE FUNCTION link_invitation_to_response();