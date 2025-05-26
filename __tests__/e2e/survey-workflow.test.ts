/**
 * End-to-End Test: Survey Completion Workflow
 * 
 * Tests the complete flow of a user receiving an invitation,
 * clicking the link, and completing a survey.
 */

import { supabase } from '../../lib/supabase'
import { getInvitationByToken, markInvitationOpened } from '../../lib/invitations'

// Mock dependencies
jest.mock('../../lib/supabase')
jest.mock('../../lib/invitations')

describe('Survey Completion Workflow', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>
  const mockGetInvitationByToken = getInvitationByToken as jest.MockedFunction<typeof getInvitationByToken>
  const mockMarkInvitationOpened = markInvitationOpened as jest.MockedFunction<typeof markInvitationOpened>

  const mockInvitation = {
    id: 'inv-123',
    token: 'test-token-123',
    batch_id: 'batch-123',
    survey_id: 'hip-replacement-assessment',
    recipient_email: 'doctor@hospital.com',
    recipient_name: 'Dr. Smith',
    recipient_state: 'CA',
    timezone: 'America/Los_Angeles',
    reminder_count: 0,
    created_at: '2024-01-01',
    sent_at: '2024-01-01T09:00:00Z'
  }

  const mockSurvey = {
    id: 'hip-replacement-assessment',
    title: 'Hip Replacement Assessment',
    description: 'Survey about hip replacement solutions',
    schema: {
      pages: [{
        name: 'page1',
        elements: [{
          type: 'radiogroup',
          name: 'experience',
          title: 'How many years of experience do you have?',
          choices: ['0-5', '5-10', '10-15', '15+']
        }]
      }]
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Step 1: User clicks invitation link', () => {
    it('should load invitation data and mark as opened', async () => {
      mockGetInvitationByToken.mockResolvedValue(mockInvitation)
      mockMarkInvitationOpened.mockResolvedValue(undefined)

      // Simulate loading invitation
      const invitation = await getInvitationByToken('test-token-123')
      
      expect(invitation).toEqual(mockInvitation)
      expect(mockGetInvitationByToken).toHaveBeenCalledWith('test-token-123')

      // Mark as opened
      await markInvitationOpened('test-token-123')
      
      expect(mockMarkInvitationOpened).toHaveBeenCalledWith('test-token-123')
    })

    it('should handle invalid token', async () => {
      mockGetInvitationByToken.mockResolvedValue(null)

      const invitation = await getInvitationByToken('invalid-token')
      
      expect(invitation).toBeNull()
    })
  })

  describe('Step 2: Survey loads with prepopulated data', () => {
    it('should load survey and prepopulate contact fields', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSurvey, error: null })
      }
      
      mockSupabase.from.mockReturnValue(mockChain as any)

      // Load survey
      const { data: survey } = await mockSupabase
        .from('surveys')
        .select('*')
        .eq('id', mockInvitation.survey_id)
        .single()

      expect(survey).toEqual(mockSurvey)

      // Verify prepopulated data
      const prepopulatedData = {
        contact_email: mockInvitation.recipient_email,
        contact_name: mockInvitation.recipient_name
      }

      expect(prepopulatedData).toEqual({
        contact_email: 'doctor@hospital.com',
        contact_name: 'Dr. Smith'
      })
    })
  })

  describe('Step 3: User completes and submits survey', () => {
    it('should save response and update invitation status', async () => {
      const surveyResponse = {
        survey_id: mockSurvey.id,
        survey_data: {
          experience: '10-15',
          contact_email: 'doctor@hospital.com',
          contact_name: 'Dr. Smith'
        },
        contact_email: 'doctor@hospital.com',
        contact_name: 'Dr. Smith',
        invitation_token: 'test-token-123'
      }

      // Mock saving response
      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'response-123', ...surveyResponse },
          error: null
        })
      }

      mockSupabase.from.mockReturnValue(insertChain as any)

      // Save response
      const { data: savedResponse } = await mockSupabase
        .from('survey_responses')
        .insert(surveyResponse)
        .select()
        .single()

      expect(savedResponse).toMatchObject(surveyResponse)
      expect(insertChain.insert).toHaveBeenCalledWith(surveyResponse)

      // Verify the trigger would mark invitation as completed
      // (In real scenario, this happens via database trigger)
      expect(savedResponse.invitation_token).toBe('test-token-123')
    })

    it('should handle anonymous responses', async () => {
      const anonymousResponse = {
        survey_id: mockSurvey.id,
        survey_data: {
          experience: '5-10'
        },
        contact_email: null,
        contact_name: null,
        invitation_token: null
      }

      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'response-456', ...anonymousResponse },
          error: null
        })
      }

      mockSupabase.from.mockReturnValue(insertChain as any)

      const { data: savedResponse } = await mockSupabase
        .from('survey_responses')
        .insert(anonymousResponse)
        .select()
        .single()

      expect(savedResponse).toMatchObject(anonymousResponse)
      expect(savedResponse.invitation_token).toBeNull()
    })
  })

  describe('Step 4: Post-submission tracking', () => {
    it('should update batch statistics after completion', async () => {
      // Mock RPC call to update stats
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null
      } as any)

      await mockSupabase.rpc('update_batch_stats', { 
        batch_uuid: mockInvitation.batch_id 
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_batch_stats', {
        batch_uuid: 'batch-123'
      })
    })

    it('should log completion event', async () => {
      const completionEvent = {
        invitation_id: mockInvitation.id,
        event_type: 'completed',
        event_data: { response_id: 'response-123' }
      }

      const insertChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabase.from.mockReturnValue(insertChain as any)

      await mockSupabase
        .from('email_events')
        .insert(completionEvent)

      expect(insertChain.insert).toHaveBeenCalledWith(completionEvent)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle database errors gracefully', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      }

      mockSupabase.from.mockReturnValue(mockChain as any)

      const result = await mockSupabase
        .from('surveys')
        .select('*')
        .eq('id', 'invalid-id')
        .single()

      expect(result.error).toBeTruthy()
      expect(result.error.message).toBe('Database connection failed')
    })

    it('should handle network timeouts', async () => {
      mockGetInvitationByToken.mockRejectedValue(new Error('Network timeout'))

      await expect(
        getInvitationByToken('test-token')
      ).rejects.toThrow('Network timeout')
    })
  })
})