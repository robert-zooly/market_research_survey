import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { Survey } from '../../types/survey'
import Papa from 'papaparse'
import LogoutButton from '../../components/LogoutButton'
import TestModeIndicator from '../../components/TestModeIndicator'

export default function AdminDashboard() {
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
        .order('created_at', { ascending: false })

      if (error) throw error
      setSurveys(data || [])
    } catch (error) {
      console.error('Error fetching surveys:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportResponses = async (surveyId: string, surveyName: string) => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', surveyId)
        .eq('is_complete', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) {
        alert('No responses found for this survey')
        return
      }

      // Flatten the response data
      const flattenedData = data.map(response => {
        const flattened: any = {
          id: response.id,
          created_at: response.created_at,
          respondent_email: response.respondent_email,
          respondent_name: response.respondent_name,
          respondent_address: response.respondent_address
        }

        // Process response data
        Object.entries(response.response_data).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
              // Handle arrays (like checkbox selections)
              flattened[key] = value.join('; ')
            } else {
              // Handle objects (like matrix questions)
              // For clinical_challenges, it's an object with keys like "cup_anteversion": 3
              const ratings = Object.entries(value)
                .map(([item, rating]) => `${item}: ${rating}`)
                .join('; ')
              flattened[key] = ratings
            }
          } else {
            flattened[key] = value
          }
        })

        return flattened
      })

      // Convert to CSV
      const csv = Papa.unparse(flattenedData)

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${surveyName.replace(/\s+/g, '_')}_responses.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting responses:', error)
      alert('Failed to export responses')
    }
  }

  const toggleSurveyStatus = async (surveyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('surveys')
        .update({ is_active: !currentStatus })
        .eq('id', surveyId)

      if (error) throw error
      fetchSurveys()
    } catch (error) {
      console.error('Error updating survey status:', error)
    }
  }

  return (
    <>
      <TestModeIndicator />
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', marginTop: process.env.NEXT_PUBLIC_TEST_MODE === 'true' ? '50px' : '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <LogoutButton />
        </div>
      
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <Link 
          href="/admin/create"
          style={{ 
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          Create New Survey
        </Link>
        <Link 
          href="/admin/update-survey"
          style={{ 
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#22c55e',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          Update Survey Template
        </Link>
        <Link 
          href="/admin/invitations"
          style={{ 
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#9333ea',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          Manage Invitations
        </Link>
      </div>

      {loading ? (
        <p>Loading surveys...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Survey Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Created</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {surveys.map(survey => (
              <tr key={survey.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem' }}>
                  <Link
                    href={`/survey/${survey.id}`}
                    target="_blank"
                    style={{ 
                      color: '#0070f3',
                      textDecoration: 'none'
                    }}
                  >
                    {survey.name}
                  </Link>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: survey.is_active ? '#4caf50' : '#f44336',
                    color: 'white',
                    fontSize: '0.875rem'
                  }}>
                    {survey.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {new Date(survey.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <Link
                    href={`/survey/${survey.id}`}
                    target="_blank"
                    style={{ 
                      marginRight: '0.5rem',
                      padding: '0.25rem 0.75rem',
                      border: '1px solid #0070f3',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      color: '#0070f3',
                      textDecoration: 'none',
                      display: 'inline-block'
                    }}
                  >
                    View Survey
                  </Link>
                  <button
                    onClick={() => toggleSurveyStatus(survey.id, survey.is_active)}
                    style={{ 
                      marginRight: '0.5rem',
                      padding: '0.25rem 0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {survey.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => exportResponses(survey.id, survey.name)}
                    style={{ 
                      padding: '0.25rem 0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Export CSV
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      <div style={{ marginTop: '2rem' }}>
        <Link href="/" style={{ color: '#0070f3' }}>← Back to Home</Link>
      </div>
    </div>
    </>
  )
}