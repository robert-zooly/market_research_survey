import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { InvitationBatch, CSVRow } from '../../types/invitation'
import { getInvitationBatches, createInvitationBatch, createInvitations } from '../../lib/invitations'
import { parse } from 'papaparse'

export default function InvitationsPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<InvitationBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadMode, setUploadMode] = useState(false)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [batchName, setBatchName] = useState('')
  const [selectedSurveyId, setSelectedSurveyId] = useState('')
  const [surveys, setSurveys] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadBatches()
    loadSurveys()
  }, [])

  const loadBatches = async () => {
    try {
      const data = await getInvitationBatches()
      setBatches(data)
    } catch (error) {
      console.error('Error loading batches:', error)
    }
  }

  const loadSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, title')
        .eq('is_active', true)
        .order('title')

      if (error) throw error
      setSurveys(data || [])
    } catch (error) {
      console.error('Error loading surveys:', error)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CSVRow[]
        
        // Validate required fields
        const validRows = data.filter(row => row.email && row.email.includes('@'))
        
        if (validRows.length === 0) {
          setError('No valid email addresses found in CSV')
          return
        }

        setCsvData(validRows)
        setError('')
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`)
      }
    })
  }

  const handleCreateBatch = async () => {
    if (!batchName || !selectedSurveyId || csvData.length === 0) {
      setError('Please fill in all fields and upload a CSV')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create batch
      const batch = await createInvitationBatch(batchName, csvData)
      
      // Create invitations
      await createInvitations(batch.id, selectedSurveyId, csvData)
      
      // Reload batches
      await loadBatches()
      
      // Reset form
      setUploadMode(false)
      setCsvData([])
      setBatchName('')
      setSelectedSurveyId('')
      
      // Navigate to batch details
      router.push(`/admin/invitations/${batch.id}`)
    } catch (error: any) {
      setError(error.message || 'Error creating batch')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString()
  }

  const getCompletionRate = (batch: InvitationBatch) => {
    if (batch.sent_count === 0) return '0%'
    return `${Math.round((batch.completed_count / batch.sent_count) * 100)}%`
  }

  if (uploadMode) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Create Invitation Batch</h1>
        
        <button 
          onClick={() => {
            setUploadMode(false)
            setCsvData([])
            setBatchName('')
            setError('')
          }}
          style={{ marginBottom: '20px' }}
        >
          ← Back to Batches
        </button>

        {error && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label>
            <strong>Batch Name:</strong><br />
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g., Tuesday Hip Replacement Survey"
              style={{ 
                width: '100%', 
                padding: '8px',
                marginTop: '5px',
                fontSize: '16px'
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            <strong>Select Survey:</strong><br />
            <select
              value={selectedSurveyId}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px',
                marginTop: '5px',
                fontSize: '16px'
              }}
            >
              <option value="">-- Select a survey --</option>
              {surveys.map(survey => (
                <option key={survey.id} value={survey.id}>
                  {survey.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            <strong>Upload CSV File:</strong><br />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ marginTop: '5px' }}
            />
          </label>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
            CSV must contain columns: email (required), name, state
          </p>
        </div>

        {csvData.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3>Preview ({csvData.length} recipients)</h3>
            <div style={{ 
              maxHeight: '300px', 
              overflow: 'auto',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>State</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{row.email}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{row.name || '-'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{row.state || '-'}</td>
                    </tr>
                  ))}
                  {csvData.length > 10 && (
                    <tr>
                      <td colSpan={3} style={{ padding: '8px', textAlign: 'center', color: '#666' }}>
                        ... and {csvData.length - 10} more recipients
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={handleCreateBatch}
          disabled={loading || !batchName || !selectedSurveyId || csvData.length === 0}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Creating...' : `Create Batch (${csvData.length} recipients)`}
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Invitation Batches</h1>
      
      <button
        onClick={() => router.push('/admin')}
        style={{ marginBottom: '20px' }}
      >
        ← Back to Admin
      </button>

      <button
        onClick={() => setUploadMode(true)}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          marginLeft: '10px',
          cursor: 'pointer'
        }}
      >
        + Create New Batch
      </button>

      <div style={{ marginTop: '30px' }}>
        {batches.length === 0 ? (
          <p>No invitation batches yet. Create one to get started!</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Batch Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Created</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Sent</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Opened</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Completed</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Rate</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                <tr key={batch.id}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                    <strong>{batch.name}</strong>
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                    {formatDate(batch.created_at)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {batch.total_count}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {batch.sent_count}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {batch.opened_count}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {batch.completed_count}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <strong>{getCompletionRate(batch)}</strong>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <button
                      onClick={() => router.push(`/admin/invitations/${batch.id}`)}
                      style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        padding: '5px 15px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}