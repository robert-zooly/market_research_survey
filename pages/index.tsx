import { GetServerSideProps } from 'next'

export default function Home() {
  // This should never render as we redirect on the server
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      fontSize: '18px',
      color: '#666'
    }}>
      Redirecting to Zooly...
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: 'https://getzooly.com',
      permanent: false,
    },
  }
}