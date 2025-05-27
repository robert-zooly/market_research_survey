import type { NextApiRequest, NextApiResponse } from 'next'
import { SurveyInvitation } from '../../types/invitation'
import { generateEmailTemplate } from '../../lib/email-service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { invitation, surveyUrl, reminderNumber = 0 } = req.body

  if (!invitation || !surveyUrl) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const template = generateEmailTemplate(invitation, surveyUrl, reminderNumber)
    
    console.log('Sending email to:', invitation.recipient_email)
    
    // Create URLSearchParams for form data
    const formData = new URLSearchParams()
    formData.append('from', `Dr. Derek F. Amanatullah <noreply@${process.env.NEXT_PUBLIC_MAILGUN_DOMAIN}>`)
    formData.append('to', invitation.recipient_email)
    formData.append('h:Reply-To', 'research@getzooly.com')
    formData.append('subject', template.subject)
    formData.append('text', template.text)
    formData.append('html', template.html)
    formData.append('o:tracking', 'yes')
    formData.append('o:tracking-clicks', 'yes')
    formData.append('o:tracking-opens', 'yes')
    formData.append('o:tag', 'survey-invitation')
    formData.append('h:X-Invitation-ID', invitation.id)
    // Add user variables that will be returned in webhooks
    formData.append('v:invitation-id', invitation.id)

    const response = await fetch(
      `https://api.mailgun.net/v3/${process.env.NEXT_PUBLIC_MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${process.env.NEXT_PUBLIC_MAILGUN_API_KEY}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Mailgun error:', error)
      return res.status(response.status).json({ error: `Mailgun error: ${error}` })
    }

    const result = await response.json()
    console.log('Mailgun response:', result)
    
    // Only mark invitation as sent if it's not a test
    if (invitation.id !== 'test-id') {
      try {
        const { markInvitationSent } = await import('../../lib/invitations')
        await markInvitationSent(invitation.id)
      } catch (error) {
        console.warn('Could not mark invitation as sent:', error)
        // Don't fail the whole request if this fails
      }
    }
    
    return res.status(200).json({ success: true, messageId: result.id })
  } catch (error) {
    console.error('Error sending email:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    })
  }
}