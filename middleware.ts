import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only protect /admin routes (but not admin-login)
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin-login')) {
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD not set in environment variables')
      return NextResponse.next()
    }

    // Check for auth cookie
    const authCookie = request.cookies.get('admin-auth')
    
    // Check for basic auth header (for API calls)
    const basicAuth = request.headers.get('authorization')
    
    // Validate cookie - check if it's a valid auth token
    if (authCookie?.value && authCookie.value.startsWith('YXV0aGVk')) { // 'authed' in base64
      const response = NextResponse.next()
      // Add no-cache headers for admin pages
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      return response
    }
    
    // Validate basic auth
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [, pwd] = atob(authValue).split(':')
      
      if (pwd === adminPassword) {
        return NextResponse.next()
      }
    }
    
    // No valid auth, redirect to login page
    const loginUrl = new URL('/admin-login', request.url)
    loginUrl.searchParams.set('from', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}