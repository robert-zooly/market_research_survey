# Testing Database Setup Guide

## Why Use a Test Database?
- Protect production data (500 active surgeons)
- Test new features safely
- Experiment with email sending without consequences
- Test the A/B survey variations

## Recommended Approach: Supabase Branch Database

### Option 1: Supabase Branching (Recommended)
1. Go to your Supabase project dashboard
2. Click "Settings" → "Database"
3. Look for "Branching" or create a new project for testing
4. Supabase offers database branching on Pro plans

### Option 2: Create Separate Test Project (Free)
1. Create a new Supabase project (free tier is fine for testing)
2. Name it something like "market-research-test"
3. Copy your database schema

## Setting Up Your Test Database

### 1. Export Production Schema (Without Data)

**Option A: Use Supabase Dashboard (Easiest)**
1. Go to your Supabase dashboard
2. Click on "Database" → "Tables"
3. For each table, click the three dots → "View Definition"
4. Copy the SQL definition

**Option B: Export using pg_dump (if you have access)**
```bash
# Export schema only (no data)
pg_dump --schema-only --no-owner --no-acl your_database_url > schema.sql
```

**Option C: Query to list all tables**
```sql
-- First, see what tables you have
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### 2. Essential Tables to Recreate
```sql
-- Surveys table
CREATE TABLE surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    json_schema JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Survey responses with new tracking fields
CREATE TABLE survey_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id UUID REFERENCES surveys(id),
    response_data JSONB NOT NULL,
    respondent_email TEXT,
    respondent_name TEXT,
    respondent_address TEXT,
    is_complete BOOLEAN DEFAULT false,
    last_page INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0,
    invitation_token TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitation batches
CREATE TABLE invitation_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    csv_data JSONB,
    total_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Survey invitations
CREATE TABLE survey_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    batch_id UUID REFERENCES invitation_batches(id) ON DELETE CASCADE,
    survey_id UUID REFERENCES surveys(id),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    recipient_state TEXT,
    recipient_data JSONB,
    timezone TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email events
CREATE TABLE email_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invitation_id UUID REFERENCES survey_invitations(id),
    event_type TEXT NOT NULL,
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unsubscribed emails
CREATE TABLE unsubscribed_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_survey_responses_invitation_token ON survey_responses(invitation_token) WHERE invitation_token IS NOT NULL;
CREATE INDEX idx_survey_responses_incomplete ON survey_responses(survey_id, is_complete) WHERE is_complete = false;
CREATE INDEX idx_survey_invitations_batch_id ON survey_invitations(batch_id);
CREATE INDEX idx_survey_invitations_token ON survey_invitations(token);
CREATE INDEX idx_email_events_invitation_id ON email_events(invitation_id);

-- RPC function for updating batch stats
CREATE OR REPLACE FUNCTION update_batch_stats(batch_uuid UUID)
RETURNS void AS $$
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
```

### 3. Update Your .env.local for Testing
```bash
# Keep your production credentials commented out
# NEXT_PUBLIC_SUPABASE_URL=your_production_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_key

# Use test database
NEXT_PUBLIC_SUPABASE_URL=your_test_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_project_anon_key

# Add a flag to indicate test mode
NEXT_PUBLIC_TEST_MODE=true
```

### 4. Create Test Data
```sql
-- Insert test surveys
INSERT INTO surveys (name, description, json_schema, is_active) VALUES
('Hip Replacement Assessment (Short)', 'Test version of 2-minute survey', 
 '{"title": "Test Survey", "pages": [...]}', true);

-- Create test invitation batch
INSERT INTO invitation_batches (name, total_count) VALUES
('Test Batch - 10 Recipients', 10);

-- Generate test invitations
INSERT INTO survey_invitations (
    token, batch_id, survey_id, recipient_email, 
    recipient_name, recipient_state, timezone
)
SELECT 
    'test_' || gen_random_uuid()::text,
    (SELECT id FROM invitation_batches WHERE name = 'Test Batch - 10 Recipients'),
    (SELECT id FROM surveys WHERE name = 'Hip Replacement Assessment (Short)'),
    'test' || generate_series || '@example.com',
    'Test Surgeon ' || generate_series,
    CASE generate_series % 4
        WHEN 0 THEN 'CA'
        WHEN 1 THEN 'NY'
        WHEN 2 THEN 'TX'
        ELSE 'FL'
    END,
    CASE generate_series % 4
        WHEN 0 THEN 'America/Los_Angeles'
        WHEN 1 THEN 'America/New_York'
        WHEN 2 THEN 'America/Chicago'
        ELSE 'America/New_York'
    END
FROM generate_series(1, 10);
```

## Testing Workflow

### 1. Email Testing (Without Actually Sending)
Add this to your email service for test mode:
```typescript
// In lib/email-service.ts
if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
  console.log('TEST MODE: Would send email to:', recipient);
  return { id: 'test-' + Date.now(), message: 'Test mode - email not sent' };
}
```

### 2. Visual Indicator for Test Mode
Add to your admin pages:
```tsx
{process.env.NEXT_PUBLIC_TEST_MODE === 'true' && (
  <div style={{ 
    backgroundColor: '#ff9800', 
    color: 'white', 
    padding: '10px', 
    textAlign: 'center' 
  }}>
    ⚠️ TEST MODE - Using Test Database
  </div>
)}
```

## Quick Switch Between Environments

Create these scripts in package.json:
```json
{
  "scripts": {
    "dev": "next dev -p 3003",
    "dev:test": "cp .env.test .env.local && next dev -p 3003",
    "dev:prod": "cp .env.production .env.local && next dev -p 3003"
  }
}
```

Then create:
- `.env.test` - Test database credentials
- `.env.production` - Production database credentials

## Benefits of This Approach
1. ✅ Zero risk to production data
2. ✅ Test email flows without sending real emails
3. ✅ Experiment with database changes
4. ✅ Test the new survey format
5. ✅ Verify partial response tracking
6. ✅ Test the 5:30 AM scheduling

## Next Steps
1. Create new Supabase project for testing
2. Run the schema creation SQL
3. Update your .env.local
4. Add test mode indicators to your code
5. Create test data
6. Test your new features safely!