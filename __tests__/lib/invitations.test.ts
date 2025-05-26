import {
  createInvitationBatch,
  createInvitations,
  getInvitationByToken,
  markInvitationOpened,
  markInvitationSent,
  getInvitationBatches,
  getInvitationsByBatch,
  getPendingInvitations,
  getInvitationsForFollowUp
} from '../../lib/invitations'
import { supabase } from '../../lib/supabase'
import { CSVRow } from '../../types/invitation'

// Mock the supabase module
jest.mock('../../lib/supabase')
jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-token-123'
}))

describe('invitations', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock chain
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    }
    
    mockSupabase.from.mockReturnValue(mockChain as any)
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null } as any)
  })

  describe('createInvitationBatch', () => {
    it('should create a batch successfully', async () => {
      const mockBatch = {
        id: 'batch-123',
        name: 'Test Batch',
        csv_data: [{ email: 'test@example.com' }],
        total_count: 1
      }

      const mockChain = mockSupabase.from('invitation_batches')
      mockChain.single.mockResolvedValue({ data: mockBatch, error: null })

      const result = await createInvitationBatch('Test Batch', [{ email: 'test@example.com' }])

      expect(mockSupabase.from).toHaveBeenCalledWith('invitation_batches')
      expect(mockChain.insert).toHaveBeenCalledWith({
        name: 'Test Batch',
        csv_data: [{ email: 'test@example.com' }],
        total_count: 1
      })
      expect(result).toEqual(mockBatch)
    })

    it('should throw error on failure', async () => {
      const mockChain = mockSupabase.from('invitation_batches')
      mockChain.single.mockRejectedValue(new Error('Database error'))

      await expect(
        createInvitationBatch('Test Batch', [])
      ).rejects.toThrow('Database error')
    })
  })

  describe('createInvitations', () => {
    const mockRows: CSVRow[] = [
      { email: 'test1@example.com', name: 'John Doe', state: 'CA' },
      { email: 'test2@example.com', name: 'Jane Smith', state: 'NY' },
      { email: 'unsubscribed@example.com', name: 'Bob Jones', state: 'TX' }
    ]

    it('should create invitations and check unsubscribed emails', async () => {
      // Mock unsubscribed emails check
      const unsubscribedChain = mockSupabase.from('unsubscribed_emails')
      unsubscribedChain.in.mockReturnValue({
        data: [{ email: 'unsubscribed@example.com' }],
        error: null
      } as any)

      // Mock invitation creation
      const invitationChain = mockSupabase.from('survey_invitations')
      invitationChain.select.mockReturnValue({
        data: mockRows.map((row, i) => ({
          id: `inv-${i}`,
          token: 'mock-token-123',
          batch_id: 'batch-1',
          survey_id: 'survey-1',
          recipient_email: row.email,
          recipient_name: row.name,
          recipient_state: row.state,
          timezone: row.state === 'CA' ? 'America/Los_Angeles' : 
                   row.state === 'NY' ? 'America/New_York' : 'America/Chicago',
          unsubscribed_at: row.email === 'unsubscribed@example.com' ? '2024-01-01' : null
        })),
        error: null
      } as any)

      const result = await createInvitations('batch-1', 'survey-1', mockRows)

      // Verify unsubscribed check
      expect(mockSupabase.from).toHaveBeenCalledWith('unsubscribed_emails')
      expect(unsubscribedChain.select).toHaveBeenCalledWith('email')
      expect(unsubscribedChain.in).toHaveBeenCalledWith('email', [
        'test1@example.com',
        'test2@example.com',
        'unsubscribed@example.com'
      ])

      // Verify invitation creation
      expect(mockSupabase.from).toHaveBeenCalledWith('survey_invitations')
      expect(invitationChain.insert).toHaveBeenCalled()
      
      // Verify batch stats update
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_batch_stats', {
        batch_uuid: 'batch-1'
      })

      expect(result).toHaveLength(3)
      expect(result[2].unsubscribed_at).toBe('2024-01-01')
    })

    it('should handle empty unsubscribed list', async () => {
      const unsubscribedChain = mockSupabase.from('unsubscribed_emails')
      unsubscribedChain.in.mockReturnValue({
        data: [],
        error: null
      } as any)

      const invitationChain = mockSupabase.from('survey_invitations')
      invitationChain.select.mockReturnValue({
        data: [{ id: 'inv-1', recipient_email: 'test@example.com' }],
        error: null
      } as any)

      await createInvitations('batch-1', 'survey-1', [{ email: 'test@example.com' }])

      const insertCall = invitationChain.insert.mock.calls[0][0]
      expect(insertCall[0]).not.toHaveProperty('unsubscribed_at')
    })
  })

  describe('getInvitationByToken', () => {
    it('should return invitation when found', async () => {
      const mockInvitation = {
        id: 'inv-123',
        token: 'test-token',
        recipient_email: 'test@example.com'
      }

      const mockChain = mockSupabase.from('survey_invitations')
      mockChain.single.mockResolvedValue({ 
        data: mockInvitation, 
        error: null 
      })

      const result = await getInvitationByToken('test-token')

      expect(mockChain.eq).toHaveBeenCalledWith('token', 'test-token')
      expect(result).toEqual(mockInvitation)
    })

    it('should return null when not found', async () => {
      const mockChain = mockSupabase.from('survey_invitations')
      mockChain.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Not found' } 
      })

      const result = await getInvitationByToken('invalid-token')

      expect(result).toBeNull()
    })
  })

  describe('markInvitationOpened', () => {
    it('should mark invitation as opened and update stats', async () => {
      // Mock getting invitation
      const selectChain = mockSupabase.from('survey_invitations')
      selectChain.single.mockResolvedValue({
        data: { id: 'inv-123', batch_id: 'batch-123' },
        error: null
      })

      // Mock updating invitation
      const updateChain = mockSupabase.from('survey_invitations')
      updateChain.is.mockResolvedValue({ data: null, error: null })

      await markInvitationOpened('test-token')

      // Verify select
      expect(selectChain.select).toHaveBeenCalledWith('id, batch_id')
      expect(selectChain.eq).toHaveBeenCalledWith('token', 'test-token')

      // Verify update
      expect(updateChain.update).toHaveBeenCalledWith({
        opened_at: expect.any(String)
      })
      expect(updateChain.is).toHaveBeenCalledWith('opened_at', null)

      // Verify stats update
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_batch_stats', {
        batch_uuid: 'batch-123'
      })
    })

    it('should handle missing invitation gracefully', async () => {
      const mockChain = mockSupabase.from('survey_invitations')
      mockChain.single.mockResolvedValue({ data: null, error: null })

      await expect(markInvitationOpened('invalid-token')).resolves.not.toThrow()
    })
  })

  describe('markInvitationSent', () => {
    it('should mark invitation as sent and update stats', async () => {
      // Mock getting invitation
      const selectChain = mockSupabase.from('survey_invitations')
      selectChain.single.mockResolvedValue({
        data: { batch_id: 'batch-123' },
        error: null
      })

      // Mock updating invitation
      const updateChain = mockSupabase.from('survey_invitations')
      updateChain.eq.mockResolvedValue({ data: null, error: null })

      await markInvitationSent('inv-123')

      // Verify update
      expect(updateChain.update).toHaveBeenCalledWith({
        sent_at: expect.any(String)
      })
      expect(updateChain.eq).toHaveBeenCalledWith('id', 'inv-123')

      // Verify stats update
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_batch_stats', {
        batch_uuid: 'batch-123'
      })
    })
  })

  describe('getInvitationBatches', () => {
    it('should return batches ordered by creation date', async () => {
      const mockBatches = [
        { id: 'batch-1', name: 'Batch 1', created_at: '2024-01-02' },
        { id: 'batch-2', name: 'Batch 2', created_at: '2024-01-01' }
      ]

      const mockChain = mockSupabase.from('invitation_batches')
      mockChain.order.mockResolvedValue({ data: mockBatches, error: null })

      const result = await getInvitationBatches()

      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockBatches)
    })
  })

  describe('getPendingInvitations', () => {
    it('should return invitations not yet sent', async () => {
      const mockInvitations = [
        { id: 'inv-1', sent_at: null, timezone: 'America/New_York' },
        { id: 'inv-2', sent_at: null, timezone: 'America/Los_Angeles' }
      ]

      const mockChain = mockSupabase.from('survey_invitations')
      mockChain.order.mockResolvedValue({ 
        data: mockInvitations, 
        error: null 
      })

      const result = await getPendingInvitations('batch-123')

      expect(mockChain.eq).toHaveBeenCalledWith('batch_id', 'batch-123')
      expect(mockChain.is).toHaveBeenCalledWith('sent_at', null)
      expect(mockChain.order).toHaveBeenCalledWith('timezone')
      expect(result).toEqual(mockInvitations)
    })
  })

  describe('getInvitationsForFollowUp', () => {
    it('should return invitations ready for follow-up', async () => {
      const mockInvitations = [
        { 
          id: 'inv-1', 
          sent_at: '2024-01-01T10:00:00Z',
          completed_at: null,
          timezone: 'America/New_York'
        }
      ]

      const mockChain = mockSupabase.from('survey_invitations')
      mockChain.order.mockResolvedValue({ 
        data: mockInvitations, 
        error: null 
      })

      // Mock date to be 3 days after sent_at
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-04T10:00:00Z'))

      const result = await getInvitationsForFollowUp('batch-123', 3)

      expect(mockChain.eq).toHaveBeenCalledWith('batch_id', 'batch-123')
      expect(mockChain.not).toHaveBeenCalledWith('sent_at', 'is', null)
      expect(mockChain.is).toHaveBeenCalledWith('completed_at', null)
      expect(mockChain.lte).toHaveBeenCalledWith('sent_at', '2024-01-01T10:00:00.000Z')
      expect(result).toEqual(mockInvitations)

      jest.useRealTimers()
    })
  })
})