import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize } from 'cookie'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Clear the auth cookie
  const cookie = serialize('admin-auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/'
  })

  res.setHeader('Set-Cookie', cookie)
  
  // Redirect to login page
  res.writeHead(302, { Location: '/admin-login' })
  res.end()
}