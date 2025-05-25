import type { NextApiRequest, NextApiResponse } from 'next'
import { SurveyInvitation } from '../../types/invitation'
import { generateEmailTemplate } from '../../lib/email-service'

// Using dynamic import to avoid bundling node-specific modules
const FormData = require('form-data')

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
    
    const form = new FormData()
    form.append('from', `Zooly Research <research@${process.env.NEXT_PUBLIC_MAILGUN_DOMAIN}>`)
    form.append('to', invitation.recipient_email)
    form.append('subject', template.subject)
    form.append('text', template.text)
    form.append('html', template.html)
    form.append('o:tracking', 'yes')
    form.append('o:tracking-clicks', 'yes')
    form.append('o:tracking-opens', 'yes')
    form.append('o:tag', 'survey-invitation')
    form.append('h:X-Invitation-ID', invitation.id)

    const response = await fetch(
      `https://api.mailgun.net/v3/${process.env.NEXT_PUBLIC_MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${process.env.NEXT_PUBLIC_MAILGUN_API_KEY}`).toString('base64')}`
        },
        body: form
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Mailgun error:', error)
      return res.status(response.status).json({ error: `Mailgun error: ${error}` })
    }

    const result = await response.json()
    
    // Mark invitation as sent
    const { markInvitationSent } = await import('../../lib/invitations')
    await markInvitationSent(invitation.id)
    
    return res.status(200).json({ success: true, messageId: result.id })
  } catch (error) {
    console.error('Error sending email:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    })
  }
}