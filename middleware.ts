import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only protect /admin routes (but not admin-login)
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin-login')) {
    // Check for auth cookie
    const authCookie = request.cookies.get('admin-auth')
    
    // If we have an auth cookie with the correct prefix, allow access
    if (authCookie?.value && authCookie.value.startsWith('YXV0aGVk')) {
      return NextResponse.next()
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