import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token } = req.body

  if (!token) {
    return res.status(400).json({ error: 'Token is required' })
  }

  try {
    // Call the handle_unsubscribe function
    const { data, error } = await supabase
      .rpc('handle_unsubscribe', { invitation_token: token })

    if (error) {
      console.error('Unsubscribe error:', error)
      return res.status(500).json({ error: 'Failed to process unsubscribe' })
    }

    if (!data.success) {
      return res.status(400).json({ error: data.error || 'Failed to unsubscribe' })
    }

    return res.status(200).json({ success: true, message: data.message })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}