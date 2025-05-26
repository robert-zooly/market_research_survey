import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Create response with noindex headers for all routes
  const response = NextResponse.next()
  
  // Add X-Robots-Tag header to prevent indexing
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex')
  
  // Only protect /admin routes (but not admin-login)
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin-login')) {
    // Check for auth cookie
    const authCookie = request.cookies.get('admin-auth')
    
    // If we have an auth cookie with the correct prefix, allow access
    if (authCookie?.value && authCookie.value.startsWith('YXV0aGVk')) {
      return response
    }
    
    // No valid auth, redirect to login page
    const loginUrl = new URL('/admin-login', request.url)
    loginUrl.searchParams.set('from', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: '/:path*',
}