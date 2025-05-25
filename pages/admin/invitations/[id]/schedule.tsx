import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../../lib/supabase'
import { InvitationBatch, SurveyInvitation } from '../../../../types/invitation'
import { getPendingInvitations } from '../../../../lib/invitations'
import { EmailService } from '../../../../lib/email-service'
import { 
  scheduleByTimezone, 
  shouldSendNow, 
  getTimeUntilSend,
  formatTimezoneName 
} from '../../../../lib/timezone-scheduler'

export default function ScheduleSendPage() {
  const router = useRouter()
  const { id } = router.query
  const [batch, setBatch] = useState<InvitationBatch | null>(null)
  const [survey, setSurvey] = useState<any>(null)
  const [scheduledBatches, setScheduledBatches] = useState<any[]>([])
  const [sending, setSending] = useState<string | null>(null)
  const [sentBatches, setSentBatches] = useState<Set<string>>(new Set())
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [emailService] = useState(new EmailService({
    apiKey: '',
    domain: '',
    from: 'research@getzooly.com'
  }))

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadBatchAndSchedule(id)
    }
    
    // Set up refresh interval
    const interval = setInterval(() => {
      setScheduledBatches(prev => [...prev]) // Force re-render to update times
    }, 30000) // Update every 30 seconds
    
    setRefreshInterval(interval)
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [id])

  const loadBatchAndSchedule = async (batchId: string) => {
    try {
      // Load batch
      const { data: batchData, error: batchError } = await supabase
        .from('invitation_batches')
        .select('*')
        .eq('id', batchId)
        .single()

      if (batchError) throw batchError
      setBatch(batchData)

      // Load pending invitations
      const pending = await getPendingInvitations(batchId)
      
      if (pending.length === 0) {
        setScheduledBatches([])
        return
      }

      // Load survey
      const { data: surveyData } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', pending[0].survey_id)
        .single()
      
      setSurvey(surveyData)

      // Schedule batches
      const scheduled = scheduleByTimezone(pending)
      setScheduledBatches(scheduled)
    } catch (error) {
      console.error('Error loading batch:', error)
    }
  }

  const sendBatch = async (timezone: string, invitations: SurveyInvitation[]) => {
    if (!survey || sentBatches.has(timezone)) return
    
    setSending(timezone)
    
    try {
      const surveyUrl = `${window.location.origin}/survey/${survey.id}`
      await emailService.sendBatch(invitations, surveyUrl, 0)
      
      // Mark as sent
      setSentBatches(prev => {
        const newSet = new Set(prev)
        newSet.add(timezone)
        return newSet
      })
      
      // Update batch stats
      await supabase.rpc('update_batch_stats', { batch_uuid: batch?.id })
      
      // Reload
      if (id && typeof id === 'string') {
        await loadBatchAndSchedule(id)
      }
    } catch (error) {
      console.error('Error sending batch:', error)
      alert(`Failed to send to ${timezone} batch`)
    } finally {
      setSending(null)
    }
  }

  const sendAllReady = async () => {
    const now = new Date()
    const readyBatches = scheduledBatches.filter(b => 
      shouldSendNow(b.scheduledTime, now) && !sentBatches.has(b.timezone)
    )
    
    for (const batch of readyBatches) {
      await sendBatch(batch.timezone, batch.invitations)
    }
  }

  if (!batch || scheduledBatches.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Schedule Email Send</h1>
        <button onClick={() => router.push(`/admin/invitations/${id}`)}>
          ← Back to Batch
        </button>
        <p style={{ marginTop: '20px' }}>
          {!batch ? 'Loading...' : 'No pending invitations to schedule.'}
        </p>
      </div>
    )
  }

  const now = new Date()
  const totalPending = scheduledBatches.reduce((sum, b) => sum + b.invitations.length, 0)
  const readyCount = scheduledBatches.filter(b => shouldSendNow(b.scheduledTime, now) && !sentBatches.has(b.timezone)).length

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Schedule Send: {batch.name}</h1>
      
      <button onClick={() => router.push(`/admin/invitations/${id}`)}>
        ← Back to Batch
      </button>

      <div style={{ 
        backgroundColor: '#e3f2fd', 
        padding: '20px', 
        borderRadius: '8px', 
        marginTop: '20px',
        marginBottom: '30px' 
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Timezone Scheduling</h3>
        <p style={{ margin: '0 0 10px 0' }}>
          Emails will be sent at <strong>9:00 AM local time</strong> in each timezone.
        </p>
        <p style={{ margin: 0 }}>
          <strong>{totalPending} emails</strong> scheduled across {scheduledBatches.length} timezones
        </p>
      </div>

      {readyCount > 0 && (
        <div style={{ 
          backgroundColor: '#c8e6c9', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          <strong>{readyCount} timezone{readyCount > 1 ? 's' : ''} ready to send!</strong>
          <button
            onClick={sendAllReady}
            disabled={sending !== null}
            style={{
              marginLeft: '20px',
              backgroundColor: '#4caf50',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: sending ? 'not-allowed' : 'pointer'
            }}
          >
            Send All Ready Batches
          </button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Timezone</th>
            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Recipients</th>
            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Local Send Time</th>
            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Time Until Send</th>
            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Status</th>
            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {scheduledBatches.map((batch) => {
            const isReady = shouldSendNow(batch.scheduledTime, now)
            const isSent = sentBatches.has(batch.timezone)
            const isSending = sending === batch.timezone
            
            return (
              <tr key={batch.timezone}>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                  <strong>{formatTimezoneName(batch.timezone)}</strong>
                  <br />
                  <span style={{ fontSize: '12px', color: '#666' }}>{batch.timezone}</span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                  {batch.invitations.length}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                  9:00 AM
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                  {isSent ? '✓ Sent' : getTimeUntilSend(batch.scheduledTime, now)}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                  {isSent ? (
                    <span style={{ color: '#4caf50' }}>✓ Sent</span>
                  ) : isSending ? (
                    <span style={{ color: '#ff9800' }}>Sending...</span>
                  ) : isReady ? (
                    <span style={{ color: '#2196f3' }}>Ready</span>
                  ) : (
                    <span style={{ color: '#666' }}>Scheduled</span>
                  )}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                  {!isSent && isReady && (
                    <button
                      onClick={() => sendBatch(batch.timezone, batch.invitations)}
                      disabled={isSending || sending !== null}
                      style={{
                        backgroundColor: '#2196f3',
                        color: 'white',
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isSending || sending !== null ? 'not-allowed' : 'pointer',
                        opacity: isSending || sending !== null ? 0.6 : 1
                      }}
                    >
                      {isSending ? 'Sending...' : 'Send Now'}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '30px', color: '#666' }}>
        <p>
          <strong>Note:</strong> This page updates every 30 seconds. You can leave it open and batches will 
          become ready as their scheduled time arrives.
        </p>
        <p>
          Current time: {now.toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            dateStyle: 'short',
            timeStyle: 'medium'
          })} EST
        </p>
      </div>
    </div>
  )
}