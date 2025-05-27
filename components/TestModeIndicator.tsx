export default function TestModeIndicator() {
  if (process.env.NEXT_PUBLIC_TEST_MODE !== 'true') {
    return null
  }

  return (
    <div style={{ 
      backgroundColor: '#ff9800', 
      color: 'white', 
      padding: '10px', 
      textAlign: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      fontSize: '14px',
      fontWeight: 'bold',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}>
      ⚠️ TEST MODE - Using Test Database - Emails will not be sent
    </div>
  )
}