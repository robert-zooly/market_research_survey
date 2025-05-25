import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize } from 'cookie'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD not set')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  if (password === adminPassword) {
    // Set auth cookie with a simple token instead of the password
    const authToken = Buffer.from(`authed:${Date.now()}`).toString('base64')
    
    const cookie = serialize('admin-auth', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })
    
    res.setHeader('Set-Cookie', cookie)
    return res.status(200).json({ success: true })
  }

  return res.status(401).json({ error: 'Invalid password' })
}