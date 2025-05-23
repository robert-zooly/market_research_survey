import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import hipReplacementSurvey from '../../surveys/hip-replacement-assessment.json'

export default function UpdateSurvey() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<any[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchSurveys()
  }, [])

  const fetchSurveys = async () => {
    const { data, error } = await supabase
      .from('surveys')
      .select('id, name')
      .order('created_at', { ascending: false })

    if (data) setSurveys(data)
  }

  const updateSurvey = async () => {
    if (!selectedSurveyId) {
      setMessage('Please select a survey to update')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('surveys')
        .update({ json_schema: hipReplacementSurvey })
        .eq('id', selectedSurveyId)

      if (error) throw error
      
      setMessage('Survey updated successfully!')
      setTimeout(() => router.push('/admin'), 2000)
    } catch (error) {
      console.error('Error updating survey:', error)
      setMessage('Failed to update survey')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1>Update Survey Template</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Select Survey to Update:
        </label>
        <select
          value={selectedSurveyId}
          onChange={(e) => setSelectedSurveyId(e.target.value)}
          style={{ 
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        >
          <option value="">-- Select a survey --</option>
          {surveys.map(survey => (
            <option key={survey.id} value={survey.id}>{survey.name}</option>
          ))}
        </select>
      </div>

      <p style={{ marginBottom: '2rem', color: '#666' }}>
        This will update the selected survey with the latest Hip Replacement Assessment template from the codebase.
      </p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={updateSurvey}
          disabled={loading || !selectedSurveyId}
          style={{ 
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !selectedSurveyId ? 'not-allowed' : 'pointer',
            opacity: loading || !selectedSurveyId ? 0.7 : 1
          }}
        >
          {loading ? 'Updating...' : 'Update Survey'}
        </button>
        
        <Link 
          href="/admin"
          style={{ 
            padding: '0.75rem 1.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            textDecoration: 'none',
            color: '#333'
          }}
        >
          Cancel
        </Link>
      </div>

      {message && (
        <p style={{ 
          marginTop: '1rem', 
          color: message.includes('success') ? '#22c55e' : '#ef4444' 
        }}>
          {message}
        </p>
      )}
    </div>
  )
}