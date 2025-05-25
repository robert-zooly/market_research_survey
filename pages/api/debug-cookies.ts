import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(200).json({
    cookies: req.cookies,
    headers: {
      cookie: req.headers.cookie
    }
  })
}