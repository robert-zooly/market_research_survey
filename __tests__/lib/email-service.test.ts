import { EmailService, generateEmailTemplate } from '../../lib/email-service'
import { SurveyInvitation } from '../../types/invitation'

// Mock fetch globally
global.fetch = jest.fn()

describe('email-service', () => {
  const mockInvitation: SurveyInvitation = {
    id: '123',
    token: 'test-token-123',
    batch_id: 'batch-1',
    survey_id: 'survey-1',
    recipient_email: 'test@example.com',
    recipient_name: 'John Doe',
    recipient_state: 'CA',
    timezone: 'America/Los_Angeles',
    reminder_count: 0,
    created_at: '2024-01-01'
  }

  const surveyUrl = 'https://example.com/survey/test-survey'

  describe('generateEmailTemplate', () => {
    describe('initial invitation (reminder 0)', () => {
      const template = generateEmailTemplate(mockInvitation, surveyUrl, 0)

      it('should generate correct subject', () => {
        expect(template.subject).toBe(
          'Quick survey about hip replacement solutions - 2 minutes of your time'
        )
      })

      it('should include recipient name in greeting', () => {
        expect(template.html).toContain('Hi John Doe,')
        expect(template.text).toContain('Hi John Doe,')
      })

      it('should use "there" for missing recipient name', () => {
        const invitationNoName = { ...mockInvitation, recipient_name: undefined }
        const template = generateEmailTemplate(invitationNoName, surveyUrl, 0)
        
        expect(template.html).toContain('Hi there,')
        expect(template.text).toContain('Hi there,')
      })

      it('should include correct survey link with token', () => {
        const expectedLink = `${surveyUrl}?token=test-token-123`
        expect(template.html).toContain(expectedLink)
        expect(template.text).toContain(expectedLink)
      })

      it('should include unsubscribe link', () => {
        const unsubscribeLink = 'https://example.com/unsubscribe?token=test-token-123'
        expect(template.html).toContain(unsubscribeLink)
        expect(template.text).toContain(unsubscribeLink)
      })

      it('should include sender information', () => {
        expect(template.html).toContain('Derek Amanatullah')
        expect(template.html).toContain('Associate Professor, Stanford Orthopedic Surgery')
        expect(template.html).toContain('Co-Founder, Zooly Labs')
      })
    })

    describe('first reminder (reminder 1)', () => {
      const template = generateEmailTemplate(mockInvitation, surveyUrl, 1)

      it('should generate reminder subject', () => {
        expect(template.subject).toBe('Reminder: Your input needed on hip replacement survey')
      })

      it('should have yellow warning styling', () => {
        expect(template.html).toContain('background-color: #fff3cd')
        expect(template.html).toContain('border-left: 4px solid #ffc107')
      })

      it('should emphasize time requirement', () => {
        expect(template.html).toContain('It only takes 2 minutes')
        expect(template.text).toContain('It only takes 2 minutes')
      })
    })

    describe('final reminder (reminder 2+)', () => {
      const template = generateEmailTemplate(mockInvitation, surveyUrl, 2)

      it('should generate urgent subject', () => {
        expect(template.subject).toBe('Final reminder: Hip replacement survey closing soon')
      })

      it('should have red alert styling', () => {
        expect(template.html).toContain('background-color: #f8d7da')
        expect(template.html).toContain('border-left: 4px solid #dc3545')
      })

      it('should create urgency in greeting', () => {
        expect(template.html).toContain('Last chance, John Doe')
        expect(template.text).toContain('Last chance, John Doe')
      })
    })
  })

  describe('EmailService', () => {
    let emailService: EmailService
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

    beforeEach(() => {
      jest.clearAllMocks()
      emailService = new EmailService({
        apiKey: 'test-api-key',
        domain: 'test.domain.com',
        from: 'test@test.domain.com'
      })
    })

    describe('sendEmail', () => {
      it('should send email successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messageId: 'msg-123' })
        } as Response)

        const result = await emailService.sendEmail(mockInvitation, surveyUrl, 0)

        expect(result).toEqual({
          success: true,
          messageId: 'msg-123'
        })

        expect(mockFetch).toHaveBeenCalledWith('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invitation: mockInvitation,
            surveyUrl,
            reminderNumber: 0
          })
        })
      })

      it('should handle API errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Invalid API key' })
        } as Response)

        const result = await emailService.sendEmail(mockInvitation, surveyUrl, 0)

        expect(result).toEqual({
          success: false,
          error: 'Invalid API key'
        })
      })

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const result = await emailService.sendEmail(mockInvitation, surveyUrl, 0)

        expect(result).toEqual({
          success: false,
          error: 'Network error'
        })
      })
    })

    describe('sendBatch', () => {
      const mockInvitations: SurveyInvitation[] = [
        mockInvitation,
        { ...mockInvitation, id: '124', recipient_email: 'test2@example.com' },
        { ...mockInvitation, id: '125', recipient_email: 'test3@example.com' },
        { 
          ...mockInvitation, 
          id: '126', 
          recipient_email: 'unsubscribed@example.com',
          unsubscribed_at: '2024-01-02'
        }
      ]

      it('should filter out unsubscribed users', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ messageId: 'msg-123' })
        } as Response)

        await emailService.sendBatch(mockInvitations, surveyUrl, 0)

        // Should only send 3 emails (excluding unsubscribed)
        expect(mockFetch).toHaveBeenCalledTimes(3)
        
        // Verify unsubscribed email was not sent
        const calls = mockFetch.mock.calls
        calls.forEach(call => {
          const body = JSON.parse(call[1]?.body as string)
          expect(body.invitation.recipient_email).not.toBe('unsubscribed@example.com')
        })
      })

      it('should handle all unsubscribed invitations', async () => {
        const allUnsubscribed = mockInvitations.map(inv => ({
          ...inv,
          unsubscribed_at: '2024-01-02'
        }))

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

        await emailService.sendBatch(allUnsubscribed, surveyUrl, 0)

        expect(mockFetch).not.toHaveBeenCalled()
        expect(consoleSpy).toHaveBeenCalledWith(
          'No active invitations to send (all unsubscribed)'
        )

        consoleSpy.mockRestore()
      })

      it('should send in batches with delays', async () => {
        // Create 15 active invitations to test batching
        const manyInvitations = Array.from({ length: 15 }, (_, i) => ({
          ...mockInvitation,
          id: `inv-${i}`,
          recipient_email: `test${i}@example.com`
        }))

        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ messageId: 'msg-123' })
        } as Response)

        const setTimeoutSpy = jest.spyOn(global, 'setTimeout')

        await emailService.sendBatch(manyInvitations, surveyUrl, 0)

        // Should send 15 emails (batch size is 10, so 2 batches)
        expect(mockFetch).toHaveBeenCalledTimes(15)
        
        // Should have 1 delay between batches
        expect(setTimeoutSpy).toHaveBeenCalledTimes(1)
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000)

        setTimeoutSpy.mockRestore()
      })

      it('should log errors for failed sends', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ messageId: 'msg-123' })
          } as Response)
          .mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Rate limit exceeded' })
          } as Response)

        await emailService.sendBatch(
          [mockInvitation, { ...mockInvitation, id: '124', recipient_email: 'test2@example.com' }],
          surveyUrl,
          0
        )

        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to send to test2@example.com:',
          'Rate limit exceeded'
        )

        consoleSpy.mockRestore()
      })
    })
  })
})