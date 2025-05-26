import { useState } from 'react'
import { useRouter } from 'next/router'

export default function TestEmailPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)

  const sendTestEmail = async () => {
    if (!email) {
      alert('Please enter an email address')
      return
    }

    setSending(true)
    setResult(null)

    try {
      const testInvitation = {
        id: 'test-id',
        token: 'test-token-123',
        batch_id: 'test-batch',
        survey_id: 'test-survey',
        recipient_email: email,
        recipient_name: 'Test User',
        recipient_state: 'NY',
        timezone: 'America/New_York',
        reminder_count: 0,
        created_at: new Date().toISOString()
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitation: testInvitation,
          surveyUrl: `${window.location.origin}/survey/test`,
          reminderNumber: 0
        })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        alert('Test email sent successfully! Check your inbox.')
      } else {
        alert(`Failed to send email: ${data.error}`)
      }
    } catch (error) {
      console.error('Error:', error)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
      alert('Failed to send test email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Test Email Integration</h1>
      
      <button onClick={() => router.push('/admin/invitations')} style={{ marginBottom: '20px' }}>
        ← Back to Invitations
      </button>

      <div style={{ marginBottom: '20px' }}>
        <label>
          <strong>Send test email to:</strong><br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ 
              width: '100%', 
              padding: '8px',
              marginTop: '5px',
              fontSize: '16px'
            }}
          />
        </label>
      </div>

      <button
        onClick={sendTestEmail}
        disabled={sending || !email}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: sending ? 'not-allowed' : 'pointer',
          opacity: sending || !email ? 0.6 : 1
        }}
      >
        {sending ? 'Sending...' : 'Send Test Email'}
      </button>

      {result && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          <pre style={{ margin: 0, fontSize: '14px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '40px', color: '#666' }}>
        <h3>Mailgun Configuration:</h3>
        <p>Domain: {process.env.NEXT_PUBLIC_MAILGUN_DOMAIN || 'Not set'}</p>
        <p>API Key: {process.env.NEXT_PUBLIC_MAILGUN_API_KEY ? '***' + process.env.NEXT_PUBLIC_MAILGUN_API_KEY.slice(-4) : 'Not set'}</p>
      </div>
    </div>
  )
}