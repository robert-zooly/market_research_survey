import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function UnsubscribePage() {
  const router = useRouter()
  const { token } = router.query
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (token && typeof token === 'string') {
      handleUnsubscribe(token)
    }
  }, [token])

  const handleUnsubscribe = async (invitationToken: string) => {
    try {
      // TODO: Implement unsubscribe logic
      // For now, just show success
      setStatus('success')
    } catch (error) {
      console.error('Error unsubscribing:', error)
      setStatus('error')
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        {status === 'loading' && (
          <>
            <h1>Processing...</h1>
            <p>Please wait while we process your request.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 style={{ color: '#4caf50' }}>Unsubscribed Successfully</h1>
            <p>You have been removed from our mailing list.</p>
            <p>You will no longer receive survey invitations from us.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 style={{ color: '#f44336' }}>Unsubscribe Failed</h1>
            <p>We couldn't process your request. Please try again or contact support.</p>
            <p>Email: research@getzooly.com</p>
          </>
        )}

        <div style={{ marginTop: '30px' }}>
          <a 
            href="/"
            style={{
              color: '#1976d2',
              textDecoration: 'none'
            }}
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  )
}