import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthenticatedRequest extends Request {
  user?: any
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod'

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = (req.headers.authorization || (req.headers['x-api-key'] as string | undefined)) ?? ''
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: invalid token' })
  }
}