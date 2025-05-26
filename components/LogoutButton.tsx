import { useRouter } from 'next/router'

export default function LogoutButton() {
  const router = useRouter()
  
  const handleLogout = async () => {
    try {
      // Call logout API
      await fetch('/api/admin-logout', {
        method: 'POST',
        credentials: 'same-origin'
      })
      
      // Clear any client-side storage
      if (typeof window !== 'undefined') {
        // Force reload to clear any cached auth state
        window.location.href = '/admin-login'
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Even if API fails, redirect to login
      window.location.href = '/admin-login'
    }
  }

  return (
    <button 
      onClick={handleLogout}
      style={{ 
        padding: '0.5rem 1rem',
        backgroundColor: '#dc3545',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '4px',
        fontSize: '14px',
        border: 'none',
        cursor: 'pointer'
      }}
    >
      Logout
    </button>
  )
}