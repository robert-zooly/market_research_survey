import { useEffect, useState } from 'react'

export default function DebugCookies() {
  const [cookies, setCookies] = useState<string>('')
  const [serverCookies, setServerCookies] = useState<any>(null)

  useEffect(() => {
    // Get client-side cookies
    setCookies(document.cookie)
    
    // Get server-side view of cookies
    fetch('/api/debug-cookies')
      .then(res => res.json())
      .then(data => setServerCookies(data))
      .catch(err => console.error(err))
  }, [])

  const clearCookie = async () => {
    await fetch('/api/admin-logout', { method: 'POST' })
    window.location.reload()
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Cookie Debug Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Client-side cookies:</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px' }}>
          {cookies || 'No cookies found'}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Server-side cookies:</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px' }}>
          {JSON.stringify(serverCookies, null, 2)}
        </pre>
      </div>

      <div>
        <button 
          onClick={clearCookie}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Clear Auth Cookie
        </button>
        
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Page
        </button>
      </div>
    </div>
  )
}