import { NextApiRequest, NextApiResponse } from 'next'
import handler from '../../pages/api/unsubscribe'
import { supabase } from '../../lib/supabase'

jest.mock('../../lib/supabase')

describe('/api/unsubscribe', () => {
  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  const mockSupabase = supabase as jest.Mocked<typeof supabase>

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {
        token: 'test-token-123'
      }
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    jest.clearAllMocks()
  })

  it('should handle successful unsubscribe', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { success: true, message: 'Successfully unsubscribed' },
      error: null
    } as any)

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(mockSupabase.rpc).toHaveBeenCalledWith('handle_unsubscribe', {
      invitation_token: 'test-token-123'
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Successfully unsubscribed'
    })
  })

  it('should handle invalid token', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { success: false, error: 'Invalid token' },
      error: null
    } as any)

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid token'
    })
  })

  it('should handle database errors', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' }
    } as any)

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to process unsubscribe'
    })
  })

  it('should reject non-POST methods', async () => {
    req.method = 'GET'

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Method not allowed'
    })
    expect(mockSupabase.rpc).not.toHaveBeenCalled()
  })

  it('should validate token presence', async () => {
    req.body = {}

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token is required'
    })
    expect(mockSupabase.rpc).not.toHaveBeenCalled()
  })

  it('should handle unexpected errors', async () => {
    mockSupabase.rpc.mockRejectedValue(new Error('Unexpected error'))

    await handler(req as NextApiRequest, res as NextApiResponse)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error'
    })
  })
})