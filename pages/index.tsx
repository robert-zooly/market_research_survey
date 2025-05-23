import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { Survey } from '../types/survey'

export default function Home() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSurveys()
  }, [])

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSurveys(data || [])
    } catch (error) {
      console.error('Error fetching surveys:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>Available Surveys</h1>
      
      {loading ? (
        <p>Loading surveys...</p>
      ) : surveys.length === 0 ? (
        <p>No active surveys available.</p>
      ) : (
        <div>
          {surveys.map(survey => (
            <div key={survey.id} style={{ 
              border: '1px solid #ddd', 
              padding: '1rem', 
              marginBottom: '1rem',
              borderRadius: '8px'
            }}>
              <h2>{survey.name}</h2>
              <p>{survey.description}</p>
              <Link 
                href={`/survey/${survey.id}`}
                style={{ 
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#0070f3',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  marginTop: '0.5rem'
                }}
              >
                Take Survey
              </Link>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: '2rem' }}>
        <Link href="/admin" style={{ color: '#0070f3' }}>Admin Dashboard →</Link>
      </div>
    </div>
  )
}