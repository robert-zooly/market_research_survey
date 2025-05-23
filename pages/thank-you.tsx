import Link from 'next/link'

export default function ThankYou() {
  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '0 auto', 
      padding: '2rem',
      textAlign: 'center',
      marginTop: '4rem'
    }}>
      <h1>Thank You!</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        Your response has been successfully recorded.
      </p>
      <Link 
        href="/"
        style={{ 
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#0070f3',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px'
        }}
      >
        Back to Home
      </Link>
    </div>
  )
}