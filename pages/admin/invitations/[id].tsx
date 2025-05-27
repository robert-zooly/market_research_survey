import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../lib/supabase'
import { InvitationBatch, SurveyInvitation, TimezoneGroup } from '../../../types/invitation'
import { getInvitationsByBatch, getPendingInvitations } from '../../../lib/invitations'
import { EmailService } from '../../../lib/email-service'

export default function BatchDetailsPage() {
  const router = useRouter()
  const { id } = router.query
  const [batch, setBatch] = useState<InvitationBatch | null>(null)
  const [invitations, setInvitations] = useState<SurveyInvitation[]>([])
  const [survey, setSurvey] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [selectedTimezone, setSelectedTimezone] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [emailService, setEmailService] = useState<EmailService | null>(null)

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadBatchDetails(id)
    }
  }, [id])

  useEffect(() => {
    // Initialize email service
    setEmailService(new EmailService({
      apiKey: '', // Not needed for client-side
      domain: '', // Not needed for client-side
      from: 'research@getzooly.com'
    }))
  }, [])

  const loadBatchDetails = async (batchId: string) => {
    try {
      // Load batch
      const { data: batchData, error: batchError } = await supabase
        .from('invitation_batches')
        .select('*')
        .eq('id', batchId)
        .single()

      if (batchError) throw batchError
      setBatch(batchData)

      // Load invitations
      const invitationData = await getInvitationsByBatch(batchId)
      setInvitations(invitationData)

      // Load survey details
      if (invitationData.length > 0) {
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('*')
          .eq('id', invitationData[0].survey_id)
          .single()

        if (surveyError) throw surveyError
        setSurvey(surveyData)
      }
    } catch (error) {
      console.error('Error loading batch details:', error)
    }
  }

  const groupByTimezone = (invitations: SurveyInvitation[]): TimezoneGroup[] => {
    const groups: Record<string, TimezoneGroup> = {}
    
    invitations.forEach(inv => {
      const tz = inv.timezone || 'America/New_York'
      if (!groups[tz]) {
        groups[tz] = {
          timezone: tz,
          offset: getTimezoneOffset(tz),
          invitations: []
        }
      }
      groups[tz].invitations.push(inv)
    })

    return Object.values(groups).sort((a, b) => a.offset - b.offset)
  }

  const getTimezoneOffset = (timezone: string): number => {
    const offsets: Record<string, number> = {
      'America/New_York': -5,
      'America/Chicago': -6,
      'America/Denver': -7,
      'America/Phoenix': -7,
      'America/Los_Angeles': -8,
      'America/Anchorage': -9,
      'Pacific/Honolulu': -10
    }
    return offsets[timezone] || -5
  }

  const getFilteredInvitations = () => {
    let filtered = invitations

    if (selectedTimezone !== 'all') {
      filtered = filtered.filter(inv => inv.timezone === selectedTimezone)
    }

    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'pending':
          filtered = filtered.filter(inv => !inv.sent_at)
          break
        case 'sent':
          filtered = filtered.filter(inv => inv.sent_at && !inv.completed_at)
          break
        case 'opened':
          filtered = filtered.filter(inv => inv.opened_at && !inv.completed_at)
          break
        case 'completed':
          filtered = filtered.filter(inv => inv.completed_at)
          break
      }
    }

    return filtered
  }

  const handleSendEmails = async () => {
    if (!batch || !emailService || !survey) {
      alert('Email service not available.')
      return
    }

    setSending(true)
    
    try {
      const pending = await getPendingInvitations(batch.id)
      const surveyUrl = `${window.location.origin}/survey/${survey.id}`
      
      // Group by timezone
      const timezoneGroups = groupByTimezone(pending)
      
      // Send by timezone
      for (const group of timezoneGroups) {
        console.log(`Sending to ${group.invitations.length} recipients in ${group.timezone}`)
        await emailService.sendBatch(group.invitations, surveyUrl, 0)
        
        // Update batch stats
        await supabase.rpc('update_batch_stats', { batch_uuid: batch.id })
      }
      
      // Reload data
      await loadBatchDetails(batch.id)
      alert('Emails sent successfully!')
    } catch (error) {
      console.error('Error sending emails:', error)
      alert('Error sending emails. Check console for details.')
    } finally {
      setSending(false)
    }
  }

  const handleSendReminders = async (reminderNumber: number) => {
    if (!batch || !emailService || !survey) {
      alert('Email service not configured')
      return
    }

    setSending(true)
    
    try {
      const daysMap: Record<number, number> = { 1: 3, 2: 7 }
      const { getInvitationsForFollowUp } = await import('../../../lib/invitations')
      const needsReminder = await getInvitationsForFollowUp(batch.id, daysMap[reminderNumber])
      
      if (needsReminder.length === 0) {
        alert('No recipients need reminders at this time')
        return
      }

      const surveyUrl = `${window.location.origin}/survey/${survey.id}`
      await emailService.sendBatch(needsReminder, surveyUrl, reminderNumber)
      
      // Update reminder count
      await supabase
        .from('survey_invitations')
        .update({ 
          reminder_count: reminderNumber,
          last_reminder_at: new Date().toISOString()
        })
        .in('id', needsReminder.map(inv => inv.id))
      
      await loadBatchDetails(batch.id)
      alert(`Sent ${needsReminder.length} reminder emails!`)
    } catch (error) {
      console.error('Error sending reminders:', error)
      alert('Error sending reminders')
    } finally {
      setSending(false)
    }
  }

  if (!batch || !invitations) {
    return <div style={{ padding: '20px' }}>Loading...</div>
  }

  const timezoneGroups = groupByTimezone(invitations)
  const filteredInvitations = getFilteredInvitations()

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>{batch.name}</h1>
      
      <button onClick={() => router.push('/admin/invitations')} style={{ marginBottom: '20px' }}>
        ← Back to Batches
      </button>

      {/* Refresh Button */}
      <div style={{ marginBottom: '20px', textAlign: 'right' }}>
        <button
          onClick={() => loadBatchDetails(batch.id)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Refresh Stats
        </button>
      </div>

      {/* Batch Summary */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: '20px',
        marginBottom: '30px' 
      }}>
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#666' }}>Total Recipients</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{batch.total_count}</p>
        </div>
        <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#666' }}>Sent</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{batch.sent_count}</p>
        </div>
        <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#666' }}>Opened</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{batch.opened_count}</p>
        </div>
        <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#666' }}>Completed</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{batch.completed_count}</p>
        </div>
        {batch.failed_count !== undefined && batch.failed_count > 0 && (
          <div style={{ backgroundColor: '#ffebee', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#666' }}>Failed</h3>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#d32f2f' }}>{batch.failed_count}</p>
          </div>
        )}
        <div style={{ backgroundColor: '#f3e5f5', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#666' }}>Completion Rate</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>
            {batch.sent_count > 0 ? Math.round((batch.completed_count / batch.sent_count) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => router.push(`/admin/invitations/${batch.id}/schedule`)}
          disabled={batch.sent_count === batch.total_count}
          style={{
            backgroundColor: '#2196f3',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: batch.sent_count === batch.total_count ? 'not-allowed' : 'pointer',
            opacity: batch.sent_count === batch.total_count ? 0.6 : 1
          }}
        >
          📅 Schedule by Timezone (9 AM local time)
        </button>

        <button
          onClick={handleSendEmails}
          disabled={sending || batch.sent_count === batch.total_count}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending || batch.sent_count === batch.total_count ? 0.6 : 1
          }}
        >
          {sending ? 'Sending...' : `⚡ Send All Now (${batch.total_count - batch.sent_count} pending)`}
        </button>

        <button
          onClick={() => handleSendReminders(1)}
          disabled={sending || batch.sent_count === 0}
          style={{
            backgroundColor: '#ffc107',
            color: '#212529',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending || batch.sent_count === 0 ? 0.6 : 1
          }}
        >
          Send Day 3 Reminders
        </button>

        <button
          onClick={() => handleSendReminders(2)}
          disabled={sending || batch.sent_count === 0}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending || batch.sent_count === 0 ? 0.6 : 1
          }}
        >
          Send Day 7 Reminders
        </button>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
        <div>
          <label>
            Filter by Status:{' '}
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '5px' }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent (not completed)</option>
              <option value="opened">Opened (not completed)</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>

        <div>
          <label>
            Filter by Timezone:{' '}
            <select 
              value={selectedTimezone} 
              onChange={(e) => setSelectedTimezone(e.target.value)}
              style={{ padding: '5px' }}
            >
              <option value="all">All Timezones</option>
              {timezoneGroups.map(group => (
                <option key={group.timezone} value={group.timezone}>
                  {group.timezone} ({group.invitations.length})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Invitations Table */}
      <div style={{ marginTop: '30px' }}>
        <h2>Recipients ({filteredInvitations.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>State</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Timezone</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Sent</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Opened</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Completed</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Reminders</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.slice(0, 100).map(invitation => (
                <tr key={invitation.id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{invitation.recipient_email}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{invitation.recipient_name || '-'}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{invitation.recipient_state || '-'}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontSize: '12px' }}>{invitation.timezone}</td>
                  <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {invitation.failed_at ? (
                      <span style={{ color: 'red' }} title={invitation.failure_reason || 'Failed'}>❌</span>
                    ) : invitation.sent_at ? (
                      '✓'
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {invitation.opened_at ? '✓' : '-'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {invitation.completed_at ? '✓' : '-'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {invitation.reminder_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInvitations.length > 100 && (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '10px' }}>
              Showing first 100 of {filteredInvitations.length} recipients
            </p>
          )}
        </div>
      </div>
    </div>
  )
}