import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize } from 'cookie'

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  // Clear the auth cookie by setting it to expire in the past
  const cookie = serialize('admin-auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: -1,
    expires: new Date(0),
    path: '/'
  })

  res.setHeader('Set-Cookie', cookie)
  res.setHeader('Cache-Control', 'no-store')
  
  // Send JSON response
  res.status(200).json({ success: true })
}