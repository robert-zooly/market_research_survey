import { NextApiRequest, NextApiResponse } from 'next'
import handler from '../../pages/api/send-email'
import { supabase } from '../../lib/supabase'

jest.mock('../../lib/supabase')

// Mock fetch globally
global.fetch = jest.fn()

describe('/api/send-email', () => {
  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  const mockSupabase = supabase as jest.Mocked<typeof supabase>
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  const mockInvitation = {
    id: 'inv-123',
    token: 'test-token',
    recipient_email: 'test@example.com',
    recipient_name: 'John Doe',
    reminder_count: 0
  }

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {
        invitation: mockInvitation,
        surveyUrl: 'https://example.com/survey/test',
        reminderNumber: 0
      }
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    jest.clearAllMocks()
    
    // Setup default Supabase mocks
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null })
    }
    
    mockSupabase.from.mockReturnValue(mockChain as any)
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null } as any)
  })

  it('should send email successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '<20240101.12345@mg.example.com>' })
    } as Response)

    await handler(req as NextApiRequest, res as NextApiResponse)

    // Verify Mailgun API call
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.mailgun.net/v3/test.domain.com/messages',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from('api:test-api-key').toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expect.stringContaining('from=Dr.+Derek+F.+Amanatullah')
      })
    )

    // Get the actual body sent
    const fetchCall = mockFetch.mock.calls[0]
    const body = fetchCall?.[1]?.body as string
    
    // Verify form data params
    expect(body).toContain('to=test%40example.com')
    expect(body).toContain('subject=')
    expect(body).toContain('html=')
    expect(body).toContain('text=')
    expect(body).toContain('o%3Atracking-opens=yes')

    // Verify database updates
    expect(mockSupabase.from).toHaveBeenCalledWith('survey_invitations')
    expect(mockSupabase.from).toHaveBeenCalledWith('email_events')
    
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      messageId: '<20240101.12345@mg.example.com>'
    })
  })

  it('should handle reminder emails', async () => {
    req.body.reminderNumber = 1
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '<msg-id>' })
    } as Response)

    await handler(req as NextApiRequest, res as NextApiResponse)

    const fetchCall = mockFetch.mock.calls[0]
    const body = fetchCall?.[1]?.body as string
    
    expect(body).toContain('subject=Reminder%3A+')
  })

  it('should handle Mailgun API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Invalid API key',
      status: 401
    } as Response)

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Mailgun error: Invalid API key'
    })
  })

  it('should handle database errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '<msg-id>' })
    } as Response)

    // Make database update fail
    const mockChain = mockSupabase.from('survey_invitations')
    mockChain.eq.mockResolvedValue({ 
      data: null, 
      error: { message: 'Database error' } 
    })

    await handler(req as NextApiRequest, res as NextApiResponse)

    // Should still return success if email was sent
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      messageId: '<msg-id>'
    })
  })

  it('should validate request method', async () => {
    req.method = 'GET'

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Method not allowed'
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should validate required fields', async () => {
    req.body = {}

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required fields'
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should handle missing environment variables', async () => {
    // Temporarily remove env vars
    const originalApiKey = process.env.NEXT_PUBLIC_MAILGUN_API_KEY
    const originalDomain = process.env.NEXT_PUBLIC_MAILGUN_DOMAIN
    
    delete process.env.NEXT_PUBLIC_MAILGUN_API_KEY
    delete process.env.NEXT_PUBLIC_MAILGUN_DOMAIN

    // Mock fetch to simulate error when URL is malformed
    mockFetch.mockRejectedValueOnce(new Error('Invalid URL'))

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid URL'
    })

    // Restore env vars
    process.env.NEXT_PUBLIC_MAILGUN_API_KEY = originalApiKey
    process.env.NEXT_PUBLIC_MAILGUN_DOMAIN = originalDomain
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Network error'
    })
  })

  it('should track opens with pixel', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '<msg-id>' })
    } as Response)

    await handler(req as NextApiRequest, res as NextApiResponse)

    const fetchCall = mockFetch.mock.calls[0]
    const body = fetchCall?.[1]?.body as string
    
    expect(body).toContain('o%3Atracking-opens=yes')
  })
})