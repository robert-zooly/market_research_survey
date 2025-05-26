import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import LogoutButton from '../../components/LogoutButton'

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

describe('LogoutButton', () => {
  const mockPush = jest.fn()
  const mockRouter = {
    push: mockPush,
    pathname: '/admin',
    query: {},
    asPath: '/admin'
  }
  
  const originalLocation = window.location

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    
    // Mock window.location
    delete (window as any).location
    window.location = { ...originalLocation, href: '' }
  })
  
  afterEach(() => {
    window.location = originalLocation
  })

  it('should render logout button', () => {
    render(<LogoutButton />)
    
    const button = screen.getByText('Logout')
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })

  it('should have correct styling', () => {
    render(<LogoutButton />)
    
    const button = screen.getByText('Logout')
    expect(button).toHaveStyle({
      padding: '0.5rem 1rem',
      backgroundColor: 'rgb(220, 53, 69)',
      color: 'white',
      borderRadius: '4px',
      cursor: 'pointer'
    })
  })

  it('should handle successful logout', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true
    } as Response)

    render(<LogoutButton />)
    
    const button = screen.getByText('Logout')
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin-logout', {
        method: 'POST',
        credentials: 'same-origin'
      })
      expect(window.location.href).toBe('/admin-login')
    })
  })

  it('should handle logout error gracefully', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    // Mock console.error to verify it's called
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(<LogoutButton />)
    
    const button = screen.getByText('Logout')
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error))
      // Should still redirect even on error
      expect(window.location.href).toBe('/admin-login')
    })

    consoleSpy.mockRestore()
  })

  it('should handle network error', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(<LogoutButton />)
    
    const button = screen.getByText('Logout')
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error))
      // Should still redirect even on error
      expect(window.location.href).toBe('/admin-login')
    })

    consoleSpy.mockRestore()
  })

  it('should call logout API with correct parameters', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockResolvedValueOnce({
      ok: true
    } as Response)

    render(<LogoutButton />)
    
    const button = screen.getByText('Logout')
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin-logout', {
        method: 'POST',
        credentials: 'same-origin'
      })
    })
  })
})