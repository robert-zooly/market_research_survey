import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import UnsubscribePage from '../../pages/unsubscribe'

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

describe('UnsubscribePage', () => {
  const mockRouter = {
    query: {},
    push: jest.fn(),
    pathname: '/unsubscribe',
    asPath: '/unsubscribe'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('should show loading state initially', () => {
    render(<UnsubscribePage />)
    
    expect(screen.getByText('Processing...')).toBeInTheDocument()
    expect(screen.getByText('Please wait while we process your request.')).toBeInTheDocument()
  })

  it('should handle successful unsubscribe', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Successfully unsubscribed' })
    } as Response)

    // Set router query with token
    mockRouter.query = { token: 'test-token-123' }
    
    const { rerender } = render(<UnsubscribePage />)
    
    // Force re-render with token
    rerender(<UnsubscribePage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: 'test-token-123' }),
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Unsubscribed Successfully')).toBeInTheDocument()
    })
    
    expect(screen.getByText('You have been removed from our mailing list.')).toBeInTheDocument()
    expect(screen.getByText('You will no longer receive survey invitations from us.')).toBeInTheDocument()
  })

  it('should handle failed unsubscribe', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid token' })
    } as Response)

    mockRouter.query = { token: 'invalid-token' }
    
    render(<UnsubscribePage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    expect(screen.getByText('Unsubscribe Failed')).toBeInTheDocument()
    expect(screen.getByText('We couldn\'t process your request. Please try again or contact support.')).toBeInTheDocument()
    expect(screen.getByText('Email: research@getzooly.com')).toBeInTheDocument()
  })

  it('should handle network errors', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    mockRouter.query = { token: 'test-token' }
    
    render(<UnsubscribePage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    expect(screen.getByText('Unsubscribe Failed')).toBeInTheDocument()
    expect(consoleSpy).toHaveBeenCalledWith('Error unsubscribing:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('should include return home link to getzooly.com', () => {
    render(<UnsubscribePage />)
    
    const returnLink = screen.getByText('Return to Home')
    expect(returnLink).toBeInTheDocument()
    expect(returnLink).toHaveAttribute('href', 'https://getzooly.com')
  })

  it('should not call API without token', () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    
    // No token in query
    mockRouter.query = {}
    
    render(<UnsubscribePage />)

    // Should stay in loading state
    expect(screen.getByText('Processing...')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should handle non-string token', () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    
    // Array token (invalid)
    mockRouter.query = { token: ['token1', 'token2'] }
    
    render(<UnsubscribePage />)

    // Should stay in loading state
    expect(screen.getByText('Processing...')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should have correct styling for success state', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    } as Response)

    mockRouter.query = { token: 'test-token' }
    
    render(<UnsubscribePage />)

    await waitFor(() => {
      const heading = screen.getByText('Unsubscribed Successfully')
      expect(heading).toHaveStyle({ color: '#4caf50' })
    })
  })

  it('should have correct styling for error state', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error' })
    } as Response)

    mockRouter.query = { token: 'test-token' }
    
    render(<UnsubscribePage />)

    await waitFor(() => {
      const heading = screen.getByText('Unsubscribe Failed')
      expect(heading).toHaveStyle({ color: '#f44336' })
    })
  })
})