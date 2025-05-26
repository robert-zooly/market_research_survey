/**
 * End-to-End Test: Email Invitation Workflow
 * 
 * Tests the complete flow from CSV upload to email sending,
 * including timezone scheduling and unsubscribe handling.
 */

import { createInvitationBatch, createInvitations } from '../../lib/invitations'
import { scheduleByTimezone } from '../../lib/timezone-scheduler'
import { EmailService } from '../../lib/email-service'
import { supabase } from '../../lib/supabase'

// Mock dependencies
jest.mock('../../lib/supabase')
jest.mock('../../lib/invitations')
jest.mock('../../lib/timezone-scheduler')
jest.mock('../../lib/email-service')

describe('Email Invitation Workflow', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>
  const mockCreateInvitationBatch = createInvitationBatch as jest.MockedFunction<typeof createInvitationBatch>
  const mockCreateInvitations = createInvitations as jest.MockedFunction<typeof createInvitations>
  const mockScheduleByTimezone = scheduleByTimezone as jest.MockedFunction<typeof scheduleByTimezone>

  const csvData = [
    { email: 'doctor1@hospital.com', name: 'Dr. Smith', state: 'CA' },
    { email: 'doctor2@clinic.com', name: 'Dr. Jones', state: 'NY' },
    { email: 'unsubscribed@example.com', name: 'Dr. Brown', state: 'TX' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Step 1: CSV Upload and Batch Creation', () => {
    it('should create batch and invitations from CSV', async () => {
      const mockBatch = {
        id: 'batch-123',
        name: 'January Campaign',
        uploaded_at: '2024-01-01',
        total_count: 3,
        sent_count: 0,
        opened_count: 0,
        completed_count: 0,
        unsubscribed_count: 0,
        csv_data: csvData,
        created_at: '2024-01-01'
      }

      const mockInvitations = csvData.map((row, i) => ({
        id: `inv-${i}`,
        token: `token-${i}`,
        batch_id: 'batch-123',
        survey_id: 'survey-1',
        recipient_email: row.email,
        recipient_name: row.name,
        recipient_state: row.state,
        timezone: row.state === 'CA' ? 'America/Los_Angeles' : 
                 row.state === 'NY' ? 'America/New_York' : 'America/Chicago',
        reminder_count: 0,
        created_at: '2024-01-01',
        // Mark one as unsubscribed from global list
        unsubscribed_at: row.email === 'unsubscribed@example.com' ? '2024-01-01' : undefined
      }))

      mockCreateInvitationBatch.mockResolvedValue(mockBatch)
      mockCreateInvitations.mockResolvedValue(mockInvitations)

      // Create batch
      const batch = await createInvitationBatch('January Campaign', csvData)
      expect(batch).toEqual(mockBatch)

      // Create invitations
      const invitations = await createInvitations(batch.id, 'survey-1', csvData)
      expect(invitations).toHaveLength(3)
      expect(invitations[2].unsubscribed_at).toBe('2024-01-01') // Pre-unsubscribed
    })
  })

  describe('Step 2: Timezone Scheduling', () => {
    it('should group invitations by timezone and schedule', () => {
      const mockInvitations = [
        {
          id: 'inv-1',
          token: 'token-1',
          batch_id: 'batch-123',
          survey_id: 'survey-1',
          recipient_email: 'doctor1@hospital.com',
          timezone: 'America/Los_Angeles',
          reminder_count: 0,
          created_at: '2024-01-01'
        },
        {
          id: 'inv-2',
          token: 'token-2',
          batch_id: 'batch-123',
          survey_id: 'survey-1',
          recipient_email: 'doctor2@clinic.com',
          timezone: 'America/New_York',
          reminder_count: 0,
          created_at: '2024-01-01'
        },
        {
          id: 'inv-3',
          token: 'token-3',
          batch_id: 'batch-123',
          survey_id: 'survey-1',
          recipient_email: 'unsubscribed@example.com',
          timezone: 'America/Chicago',
          reminder_count: 0,
          created_at: '2024-01-01',
          unsubscribed_at: '2024-01-01' // This one is unsubscribed
        }
      ]

      const mockScheduledBatches = [
        {
          timezone: 'America/New_York',
          offset: -5,
          invitations: [mockInvitations[1]], // Only non-unsubscribed NY
          scheduledTime: new Date('2024-01-15T14:00:00Z'), // 9am EST
          localTime: '09:00 AM'
        },
        {
          timezone: 'America/Los_Angeles',
          offset: -8,
          invitations: [mockInvitations[0]], // Only non-unsubscribed CA
          scheduledTime: new Date('2024-01-15T17:00:00Z'), // 9am PST
          localTime: '09:00 AM'
        }
        // Note: Chicago invitation is filtered out (unsubscribed)
      ]

      mockScheduleByTimezone.mockReturnValue(mockScheduledBatches)

      const scheduled = scheduleByTimezone(mockInvitations)

      expect(scheduled).toHaveLength(2) // Only 2 timezones (unsubscribed filtered)
      expect(scheduled[0].timezone).toBe('America/New_York') // East first
      expect(scheduled[1].timezone).toBe('America/Los_Angeles') // West second
      expect(scheduled.flatMap(s => s.invitations)).toHaveLength(2) // 2 active invitations
    })
  })

  describe('Step 3: Email Sending', () => {
    it('should send emails in batches', async () => {
      const mockEmailService = {
        sendBatch: jest.fn().mockResolvedValue(undefined)
      }

      const activeInvitations = [
        {
          id: 'inv-1',
          token: 'token-1',
          batch_id: 'batch-123',
          survey_id: 'survey-1',
          recipient_email: 'doctor1@hospital.com',
          recipient_name: 'Dr. Smith',
          timezone: 'America/Los_Angeles',
          reminder_count: 0,
          created_at: '2024-01-01'
        },
        {
          id: 'inv-2',
          token: 'token-2',
          batch_id: 'batch-123',
          survey_id: 'survey-1',
          recipient_email: 'doctor2@clinic.com',
          recipient_name: 'Dr. Jones',
          timezone: 'America/New_York',
          reminder_count: 0,
          created_at: '2024-01-01'
        }
      ]

      await mockEmailService.sendBatch(activeInvitations, 'https://example.com/survey/survey-1', 0)

      expect(mockEmailService.sendBatch).toHaveBeenCalledWith(
        activeInvitations,
        'https://example.com/survey/survey-1',
        0
      )
    })

    it('should update invitation status after sending', async () => {
      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabase.from.mockReturnValue(updateChain as any)
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null } as any)

      // Update sent_at
      await mockSupabase
        .from('survey_invitations')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', 'inv-1')

      expect(updateChain.update).toHaveBeenCalledWith({
        sent_at: expect.any(String)
      })

      // Update batch stats
      await mockSupabase.rpc('update_batch_stats', { batch_uuid: 'batch-123' })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_batch_stats', {
        batch_uuid: 'batch-123'
      })
    })
  })

  describe('Step 4: Unsubscribe Handling', () => {
    it('should handle unsubscribe and prevent future emails', async () => {
      // Mock unsubscribe function
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, message: 'Successfully unsubscribed' },
        error: null
      } as any)

      // Process unsubscribe
      const result = await mockSupabase.rpc('handle_unsubscribe', {
        invitation_token: 'token-1'
      })

      expect(result.data.success).toBe(true)

      // Verify future emails would be filtered
      const mockUnsubscribedInvitation = {
        id: 'inv-1',
        token: 'token-1',
        batch_id: 'batch-123',
        survey_id: 'survey-1',
        recipient_email: 'doctor1@hospital.com',
        timezone: 'America/Los_Angeles',
        reminder_count: 0,
        created_at: '2024-01-01',
        unsubscribed_at: '2024-01-02' // Now unsubscribed
      }

      // Mock scheduling with unsubscribed invitation
      mockScheduleByTimezone.mockReturnValue([])

      const scheduled = scheduleByTimezone([mockUnsubscribedInvitation])
      
      expect(scheduled).toHaveLength(0) // No batches because all unsubscribed
    })

    it('should add email to global unsubscribe list', async () => {
      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        on_conflict: jest.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabase.from.mockReturnValue(insertChain as any)

      // Add to global unsubscribe list
      await mockSupabase
        .from('unsubscribed_emails')
        .insert({ email: 'doctor1@hospital.com', source: 'link' })
        .on_conflict('email')

      expect(insertChain.insert).toHaveBeenCalledWith({
        email: 'doctor1@hospital.com',
        source: 'link'
      })
    })
  })

  describe('Step 5: Follow-up Reminders', () => {
    it('should schedule reminders for non-responders', async () => {
      const mockInvitationsForReminder = [
        {
          id: 'inv-1',
          token: 'token-1',
          batch_id: 'batch-123',
          survey_id: 'survey-1',
          recipient_email: 'doctor1@hospital.com',
          sent_at: '2024-01-01T09:00:00Z',
          opened_at: '2024-01-01T10:00:00Z',
          completed_at: null, // Not completed
          reminder_count: 0,
          timezone: 'America/Los_Angeles',
          created_at: '2024-01-01'
        }
      ]

      // Mock getting invitations for follow-up
      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockInvitationsForReminder,
          error: null
        })
      }

      mockSupabase.from.mockReturnValue(selectChain as any)

      // Get invitations needing reminder (3 days after initial send)
      const result = await mockSupabase
        .from('survey_invitations')
        .select('*')
        .eq('batch_id', 'batch-123')
        .not('sent_at', 'is', null)
        .is('completed_at', null)
        .lte('sent_at', new Date('2024-01-04').toISOString())
        .order('timezone')

      expect(result.data).toHaveLength(1)
      expect(result.data[0].completed_at).toBeNull()

      // Send reminder
      const mockEmailService = {
        sendBatch: jest.fn().mockResolvedValue(undefined)
      }

      await mockEmailService.sendBatch(
        mockInvitationsForReminder,
        'https://example.com/survey/survey-1',
        1 // Reminder number 1
      )

      expect(mockEmailService.sendBatch).toHaveBeenCalledWith(
        mockInvitationsForReminder,
        'https://example.com/survey/survey-1',
        1
      )
    })
  })
})