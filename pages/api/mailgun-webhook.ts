import { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { supabase } from '../../lib/supabase'

// Verify Mailgun webhook signature
function verifyWebhookSignature(
  timestamp: string,
  token: string,
  signature: string,
  signingKey: string
): boolean {
  const encodedToken = crypto
    .createHmac('sha256', signingKey)
    .update(timestamp.concat(token))
    .digest('hex')
  
  return encodedToken === signature
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get Mailgun webhook signing key (should be added to env)
    const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
    if (!signingKey) {
      console.error('MAILGUN_WEBHOOK_SIGNING_KEY not configured')
      return res.status(500).json({ error: 'Webhook not configured' })
    }

    // Extract signature data from request
    const { timestamp, token, signature } = req.body.signature || {}
    
    // Verify the webhook signature
    if (!timestamp || !token || !signature) {
      console.error('Missing signature data')
      return res.status(401).json({ error: 'Invalid signature' })
    }

    const isValid = verifyWebhookSignature(timestamp, token, signature, signingKey)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Extract event data
    const eventData = req.body['event-data']
    if (!eventData) {
      console.error('No event data in webhook')
      return res.status(400).json({ error: 'No event data' })
    }

    const {
      event: eventType,
      recipient,
      timestamp: eventTimestamp,
      id: messageId,
      'user-variables': userVariables = {},
      'delivery-status': deliveryStatus,
      reason,
      'client-info': clientInfo,
      'geolocation': geolocation,
      ip
    } = eventData

    // Get invitation ID from custom headers
    const invitationId = userVariables['invitation-id'] || eventData.message?.headers?.['x-invitation-id']

    if (!invitationId) {
      console.log('No invitation ID found in webhook, skipping')
      return res.status(200).json({ message: 'No invitation ID, skipping' })
    }

    // Log the event
    console.log(`Processing ${eventType} event for invitation ${invitationId}`)

    // Store the event in email_events table
    const { error: eventError } = await supabase
      .from('email_events')
      .insert({
        invitation_id: invitationId,
        event_type: eventType,
        event_data: {
          message_id: messageId,
          recipient,
          timestamp: eventTimestamp,
          delivery_status: deliveryStatus,
          reason,
          client_info: clientInfo,
          geolocation,
          ip,
          ...userVariables
        }
      })

    if (eventError) {
      console.error('Error storing email event:', eventError)
    }

    // Update invitation based on event type
    switch (eventType) {
      case 'delivered':
        // Email was successfully delivered to the recipient's server
        // We already mark as sent when we send, so this confirms delivery
        break

      case 'opened':
        // Update opened_at only if not already set
        const { error: openError } = await supabase
          .from('survey_invitations')
          .update({ opened_at: new Date(eventTimestamp * 1000).toISOString() })
          .eq('id', invitationId)
          .is('opened_at', null)

        if (!openError) {
          // Get batch ID and update stats
          const { data: invitation } = await supabase
            .from('survey_invitations')
            .select('batch_id')
            .eq('id', invitationId)
            .single()

          if (invitation?.batch_id) {
            await supabase.rpc('update_batch_stats', { batch_uuid: invitation.batch_id })
          }
        }
        break

      case 'clicked':
        // Track click events but don't update invitation status
        console.log(`Click event for invitation ${invitationId}`)
        break

      case 'bounced':
      case 'failed':
        // Mark the invitation as failed
        await supabase
          .from('survey_invitations')
          .update({ 
            failed_at: new Date(eventTimestamp * 1000).toISOString(),
            failure_reason: reason || eventType
          })
          .eq('id', invitationId)
        break

      case 'complained':
        // User marked as spam - should unsubscribe them
        const { data: invitation } = await supabase
          .from('survey_invitations')
          .select('recipient_email')
          .eq('id', invitationId)
          .single()

        if (invitation) {
          // Add to unsubscribed list
          await supabase
            .from('unsubscribed_emails')
            .insert({
              email: invitation.recipient_email,
              source: 'spam_complaint',
              unsubscribed_at: new Date(eventTimestamp * 1000).toISOString()
            })
            .onConflict('email')
            .merge()
        }
        break

      case 'unsubscribed':
        // This would come from a Mailgun unsubscribe link
        // We handle our own unsubscribe, so this might not be used
        break
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ message: 'Webhook processed' })

  } catch (error) {
    console.error('Webhook processing error:', error)
    // Still return 200 to prevent Mailgun from retrying
    return res.status(200).json({ message: 'Error processed' })
  }
}

// Disable body parsing to access raw body for signature verification
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}