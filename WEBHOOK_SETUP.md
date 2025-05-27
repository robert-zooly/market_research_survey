# Mailgun Webhook Setup

This guide explains how to configure Mailgun webhooks for email tracking.

## Prerequisites

1. Access to your Mailgun account
2. Your survey application deployed and accessible via public URL
3. Mailgun webhook signing key

## Setup Steps

### 1. Get Your Webhook Signing Key

1. Log in to your Mailgun dashboard
2. Go to Settings → Webhooks
3. Copy your webhook signing key
4. Add it to your environment variables:
   ```
   MAILGUN_WEBHOOK_SIGNING_KEY=your-signing-key-here
   ```

### 2. Configure Webhook URL

In Mailgun dashboard:
1. Go to Sending → Webhooks
2. Add a new webhook URL:
   ```
   https://survey.getzooly.com/api/mailgun-webhook
   ```

### 3. Select Events to Track

Enable the following webhook events:
- **Delivered** - Confirms email reached recipient's server
- **Opened** - Tracks when email is opened (requires tracking enabled)
- **Clicked** - Tracks link clicks in emails
- **Failed** - Permanent delivery failures
- **Complained** - Spam complaints (automatically unsubscribes)

Optional events:
- **Unsubscribed** - If using Mailgun's unsubscribe links
- **Temporary Fail** - For retry monitoring

### 4. Test Your Webhook

1. Use Mailgun's "Test Webhook" button
2. Check your application logs for incoming webhook
3. Verify signature validation is working

## Database Changes Required

Run the following SQL in your Supabase dashboard:

```sql
-- Add failure tracking fields
ALTER TABLE survey_invitations 
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add failed count to batches
ALTER TABLE invitation_batches
ADD COLUMN IF NOT EXISTS failed_count INTEGER NOT NULL DEFAULT 0;

-- Update the batch stats function (see add-webhook-tracking.sql)
```

## Webhook Security

The webhook endpoint:
1. Verifies Mailgun's signature using HMAC-SHA256
2. Only accepts POST requests
3. Validates required fields
4. Returns 200 OK to prevent retries

## Event Processing

### Opened Events
- Updates `opened_at` timestamp (only first open)
- Updates batch statistics
- Stores event in `email_events` table

### Failed Events
- Updates `failed_at` timestamp
- Stores failure reason
- Updates batch failed count

### Complained Events
- Automatically adds email to global unsubscribe list
- Prevents future emails to that address

## Monitoring

View webhook activity:
1. Check `email_events` table for all events
2. Monitor invitation details page for failed deliveries
3. Review batch statistics for delivery rates

## Troubleshooting

### Webhooks not received
- Verify URL is publicly accessible
- Check webhook signing key is correct
- Review Mailgun webhook logs

### Signature validation failures
- Ensure MAILGUN_WEBHOOK_SIGNING_KEY is set correctly
- Check for trailing spaces in environment variable

### Events not updating database
- Verify invitation IDs are being passed correctly
- Check Supabase connection and permissions
- Review application logs for errors