import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

export type UserRole = 'owner' | 'admin' | 'member'

export type AuthUser = {
  userId: number
  organizationId: number
  role: UserRole
}

type TokenPayload = AuthUser & { type: 'access' | 'refresh' }

const accessSecret = () => process.env.JWT_SECRET ?? ''
const refreshSecret = () => process.env.JWT_REFRESH_SECRET ?? ''

function requireSecret(secret: string, name: string) {
  if (!secret) throw new Error(`${name} is required`)
  return secret
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}

export function createAccessToken(user: AuthUser) {
  return jwt.sign({ ...user, type: 'access' }, requireSecret(accessSecret(), 'JWT_SECRET'), {
    expiresIn: '15m',
  })
}

export function createRefreshToken(user: AuthUser) {
  return jwt.sign({ ...user, type: 'refresh' }, requireSecret(refreshSecret(), 'JWT_REFRESH_SECRET'), {
    expiresIn: '7d',
  })
}

function decodeUser(payload: string | jwt.JwtPayload): AuthUser | null {
  if (
    typeof payload === 'string' ||
    typeof payload.userId !== 'number' ||
    typeof payload.organizationId !== 'number' ||
    !['owner', 'admin', 'member'].includes(payload.role as string)
  ) {
    return null
  }
  return {
    userId: payload.userId,
    organizationId: payload.organizationId,
    role: payload.role as UserRole,
  }
}

export function verifyAccessToken(token: string) {
  const payload = jwt.verify(token, requireSecret(accessSecret(), 'JWT_SECRET')) as jwt.JwtPayload & TokenPayload
  return payload.type === 'access' ? decodeUser(payload) : null
}

export function verifyRefreshToken(token: string) {
  const payload = jwt.verify(token, requireSecret(refreshSecret(), 'JWT_REFRESH_SECRET')) as jwt.JwtPayload & TokenPayload
  return payload.type === 'refresh' ? decodeUser(payload) : null
}

export function parseRefreshCookie(cookieHeader: string | undefined) {
  const value = cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('financeflow_refresh_token='))
    ?.slice('financeflow_refresh_token='.length)
  return value ? decodeURIComponent(value) : undefined
}

export function hashRefreshToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function createRecoveryToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function hashRecoveryToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function refreshTokenExpiresAt() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
}