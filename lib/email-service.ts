import { SurveyInvitation } from '../types/invitation'

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export function generateEmailTemplate(
  invitation: SurveyInvitation,
  surveyUrl: string,
  reminderNumber: number = 0
): EmailTemplate {
  const surveyLink = `${surveyUrl}?token=${invitation.token}`
  const name = invitation.recipient_name || 'there'
  
  let subject: string
  let bodyHtml: string
  let bodyText: string

  if (reminderNumber === 0) {
    // Initial invitation
    subject = 'Quick survey about hip replacement solutions - 2 minutes of your time'
    
    bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Survey Invitation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Hi ${name},</h2>
    
    <p style="font-size: 16px;">We're conducting research on hip replacement solutions and would value your professional input.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${surveyLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">Complete Survey</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">The survey takes about 2 minutes and your responses will help shape future products in this space.</p>
    
    <p style="font-size: 14px; color: #666;">Your response link:<br>
    <a href="${surveyLink}" style="color: #007bff; word-break: break-all;">${surveyLink}</a></p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    
    <p style="font-size: 14px;">Best regards,</p>
    
    <p style="font-size: 14px; margin: 5px 0;"><strong>Derek Amanatullah</strong><br>
    Associate Professor, Stanford Orthopedic Surgery<br>
    Co-Founder, Zooly Labs</p>
    
    <p style="font-size: 12px; color: #999; margin-top: 20px;">
      P.S. This link is unique to you and will prepopulate your information.
    </p>
  </div>
  
  <div style="font-size: 11px; color: #999; text-align: center; margin-top: 30px;">
    <p>You're receiving this because you're a healthcare professional in our network.<br>
    <a href="${surveyUrl.replace(/\/survey\/[^\/]+/, '')}/unsubscribe?token=${invitation.token}" style="color: #999;">Unsubscribe</a></p>
  </div>
</body>
</html>
`

    bodyText = `Hi ${name},

We're conducting research on hip replacement solutions and would value your professional input.

Complete the survey here: ${surveyLink}

The survey takes about 2 minutes and your responses will help shape future products in this space.

Best regards,

Derek Amanatullah
Associate Professor, Stanford Orthopedic Surgery
Co-Founder, Zooly Labs

P.S. This link is unique to you and will prepopulate your information.

---
Unsubscribe: ${surveyUrl.replace(/\/survey\/[^\/]+/, '')}/unsubscribe?token=${invitation.token}`

  } else if (reminderNumber === 1) {
    // First reminder (day 3)
    subject = 'Reminder: Your input needed on hip replacement survey'
    
    bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
    <h2 style="color: #856404; margin-top: 0;">Hi ${name},</h2>
    
    <p style="font-size: 16px;">Just a quick reminder about our hip replacement survey. Your professional perspective is valuable to us!</p>
    
    <p style="font-size: 16px;"><strong>It only takes 2 minutes</strong> and will help shape better solutions for patients.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${surveyLink}" style="display: inline-block; background-color: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">Take Survey Now</a>
    </div>
    
    <p style="font-size: 14px;">Best regards,</p>
    
    <p style="font-size: 14px; margin: 5px 0;"><strong>Derek Amanatullah</strong><br>
    Associate Professor, Stanford Orthopedic Surgery<br>
    Co-Founder, Zooly Labs</p>
  </div>
</body>
</html>
`
    
    bodyText = `Hi ${name},

Just a quick reminder about our hip replacement survey. Your professional perspective is valuable to us!

It only takes 2 minutes and will help shape better solutions for patients.

Take the survey: ${surveyLink}

Best regards,

Derek Amanatullah
Associate Professor, Stanford Orthopedic Surgery
Co-Founder, Zooly Labs`

  } else {
    // Final reminder (day 7)
    subject = 'Final reminder: Hip replacement survey closing soon'
    
    bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
    <h2 style="color: #721c24; margin-top: 0;">Last chance, ${name}</h2>
    
    <p style="font-size: 16px;">Our hip replacement survey is closing soon. We'd really appreciate your input!</p>
    
    <p style="font-size: 16px;"><strong>⏱️ Just 2 minutes</strong> to help improve patient outcomes.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${surveyLink}" style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">Complete Survey Before It Closes</a>
    </div>
    
    <p style="font-size: 14px;">Best regards,</p>
    
    <p style="font-size: 14px; margin: 5px 0;"><strong>Derek Amanatullah</strong><br>
    Associate Professor, Stanford Orthopedic Surgery<br>
    Co-Founder, Zooly Labs</p>
  </div>
</body>
</html>
`
    
    bodyText = `Last chance, ${name}

Our hip replacement survey is closing soon. We'd really appreciate your input!

Just 2 minutes to help improve patient outcomes.

Complete the survey: ${surveyLink}

Best regards,

Derek Amanatullah
Associate Professor, Stanford Orthopedic Surgery
Co-Founder, Zooly Labs`
  }

  return { subject, html: bodyHtml, text: bodyText }
}

// Placeholder for Mailgun integration
export interface MailgunConfig {
  apiKey: string
  domain: string
  from: string
}

export class EmailService {
  private config: MailgunConfig

  constructor(config: MailgunConfig) {
    this.config = config
  }

  async sendEmail(
    invitation: SurveyInvitation,
    surveyUrl: string,
    reminderNumber: number = 0
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitation,
          surveyUrl,
          reminderNumber
        })
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.error || 'Failed to send email' }
      }

      const result = await response.json()
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('Error sending email:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async sendBatch(
    invitations: SurveyInvitation[],
    surveyUrl: string,
    reminderNumber: number = 0
  ): Promise<void> {
    // Send in batches of 10 (reduced for API rate limits)
    const batchSize = 10
    
    for (let i = 0; i < invitations.length; i += batchSize) {
      const batch = invitations.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (invitation) => {
          const result = await this.sendEmail(invitation, surveyUrl, reminderNumber)
          if (!result.success) {
            console.error(`Failed to send to ${invitation.recipient_email}:`, result.error)
          }
        })
      )
      
      // Delay between batches to respect rate limits
      if (i + batchSize < invitations.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  }
}