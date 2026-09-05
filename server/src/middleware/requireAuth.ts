import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken, type AuthUser } from '../auth'

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const authorization = request.header('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined

  if (!token) {
    response.status(401).json({ error: 'Authentication required' })
    return
  }

  try {
    const user = verifyAccessToken(token)
    if (!user) throw new Error('Invalid access token')
    request.user = user
    next()
  } catch {
    response.status(401).json({ error: 'Invalid or expired access token' })
  }
}