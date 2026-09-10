import { and, eq, gt, isNull } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/client'
import { organizations, emailVerificationTokens, passwordResetTokens, refreshTokens, users } from '../db/schema'
import { logAudit } from '../audit'
import {
  createAccessToken,
  createRefreshToken,
  createRecoveryToken,
  hashPassword,
  hashRecoveryToken,
  hashRefreshToken,
  parseRefreshCookie,
  refreshTokenExpiresAt,
  verifyPassword,
  verifyRefreshToken,
} from '../auth'
import { requireAuth } from '../middleware/requireAuth'
import { authRateLimit } from '../middleware/authRateLimit'
import { sendPasswordResetEmail, sendVerificationEmail } from '../mail'
import { logger } from '../logger'

const router = Router()
const credentialsSchema = z.object({ email: z.email(), password: z.string().min(8) })
const signupSchema = credentialsSchema.extend({ organizationName: z.string().trim().min(1).max(120) })
const emailSchema = z.object({ email: z.email() })
const resetPasswordSchema = z.object({ token: z.string().min(1), password: z.string().min(8) })

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function setRefreshCookie(response: Parameters<typeof createAccessToken>[0] extends never ? never : import('express').Response, token: string) {
  const isProduction = process.env.NODE_ENV === 'production'
  response.cookie('financeflow_refresh_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  })
}

function clearRefreshCookie(response: import('express').Response) {
  const isProduction = process.env.NODE_ENV === 'production'
  response.clearCookie('financeflow_refresh_token', { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/api/auth' })
}

async function tokenResponse(response: import('express').Response, user: typeof users.$inferSelect) {
  const authUser = { userId: user.id, organizationId: user.organizationId, role: user.role }
  const refreshToken = createRefreshToken(authUser)
  await db.insert(refreshTokens).values({ userId: user.id, tokenHash: hashRefreshToken(refreshToken), expiresAt: refreshTokenExpiresAt() })
  setRefreshCookie(response, refreshToken)
  response.json({ accessToken: createAccessToken(authUser) })
}

router.post('/signup', authRateLimit, async (request, response) => {
  const parsed = signupSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Email, password, and organization name are required' })
    return
  }

  const email = normalizeEmail(parsed.data.email)
  try {
    const result = await db.transaction(async (transaction) => {
      const existing = await transaction.query.users.findFirst({ where: eq(users.email, email) })
      if (existing) throw new Error('EMAIL_EXISTS')
      const [organization] = await transaction.insert(organizations).values({ name: parsed.data.organizationName }).returning()
      const [user] = await transaction
        .insert(users)
        .values({ organizationId: organization.id, email, passwordHash: await hashPassword(parsed.data.password), role: 'owner' })
        .returning()
      return user
    })
    try {
      await logAudit({
        organizationId: result.organizationId,
        userId: result.id,
        action: 'user.signup',
        entityType: 'user',
        entityId: result.id,
        metadata: { organizationName: parsed.data.organizationName },
      })
    } catch (auditError) {
      logger.error({ err: auditError, organizationId: result.organizationId, userId: result.id }, 'failed to write signup audit log')
    }
    const verificationToken = createRecoveryToken()
    await db.insert(emailVerificationTokens).values({
      userId: result.id,
      tokenHash: hashRecoveryToken(verificationToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    try {
      const messageId = await sendVerificationEmail(result.email, verificationToken)
      logger.info({ messageId, userId: result.id }, 'verification email sent')
    } catch (mailError) {
      logger.error({ err: mailError, userId: result.id }, 'failed to send verification email')
    }
    await tokenResponse(response, result)
  } catch (error) {
    response.status(error instanceof Error && error.message === 'EMAIL_EXISTS' ? 409 : 500).json({
      error: error instanceof Error && error.message === 'EMAIL_EXISTS' ? 'Email is already registered' : 'Unable to create account',
    })
  }
})

router.post('/login', authRateLimit, async (request, response) => {
  const parsed = credentialsSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'Email and password are required' })
    return
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, normalizeEmail(parsed.data.email)) })
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    response.status(401).json({ error: 'Invalid email or password' })
    return
  }
  await tokenResponse(response, user)
})

router.post('/forgot-password', authRateLimit, async (request, response) => {
  const parsed = emailSchema.safeParse(request.body)
  if (parsed.success) {
    const user = await db.query.users.findFirst({ where: eq(users.email, normalizeEmail(parsed.data.email)) })
    if (user) {
      const token = createRecoveryToken()
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashRecoveryToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      })
      try {
        const messageId = await sendPasswordResetEmail(user.email, token)
        logger.info({ messageId, userId: user.id }, 'password reset email sent')
      } catch (mailError) {
        logger.error({ err: mailError, userId: user.id }, 'failed to send password reset email')
      }
    }
  }
  response.json({ message: 'If an account exists for that email, a password reset link has been sent.' })
})

router.post('/resend-verification', requireAuth, async (request, response) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, request.user!.userId) })
  if (!user) {
    response.status(404).json({ error: 'User not found' })
    return
  }
  if (user.emailVerifiedAt) {
    response.json({ message: 'Your email is already verified.' })
    return
  }

  const verificationToken = createRecoveryToken()
  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    tokenHash: hashRecoveryToken(verificationToken),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })
  try {
    const messageId = await sendVerificationEmail(user.email, verificationToken)
    logger.info({ messageId, userId: user.id }, 'verification email resent')
  } catch (mailError) {
    logger.error({ err: mailError, userId: user.id }, 'failed to resend verification email')
    response.status(502).json({ error: 'Unable to send verification email' })
    return
  }
  response.json({ message: 'A new verification email has been sent.' })
})

router.post('/reset-password', authRateLimit, async (request, response) => {
  const parsed = resetPasswordSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: 'A valid reset token and password are required' })
    return
  }
  const tokenHash = hashRecoveryToken(parsed.data.token)
  const result = await db.transaction(async (transaction) => {
    const [resetToken] = await transaction
      .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
    if (!resetToken) return false
    await transaction.update(users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(users.id, resetToken.userId))
    await transaction.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetToken.id))
    await transaction.update(refreshTokens).set({ revokedAt: new Date() }).where(and(eq(refreshTokens.userId, resetToken.userId), isNull(refreshTokens.revokedAt)))
    return true
  })
  if (!result) {
    response.status(400).json({ error: 'This reset link is invalid, expired, or already used' })
    return
  }
  response.json({ message: 'Password reset successfully. Please log in with your new password.' })
})

router.post('/refresh', authRateLimit, async (request, response) => {
  const token = parseRefreshCookie(request.headers.cookie)
  if (!token) {
    response.status(401).json({ error: 'Refresh token required' })
    return
  }
  try {
    const user = verifyRefreshToken(token)
    if (!user) throw new Error('Invalid refresh token')
    const [storedToken] = await db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, hashRefreshToken(token)), eq(refreshTokens.userId, user.userId), isNull(refreshTokens.revokedAt), gt(refreshTokens.expiresAt, new Date())))
    if (!storedToken) throw new Error('Refresh token revoked')
    response.json({ accessToken: createAccessToken(user) })
  } catch {
    response.status(401).json({ error: 'Invalid or expired refresh token' })
  }
})

router.post('/logout', async (request, response) => {
  const token = parseRefreshCookie(request.headers.cookie)
  if (token) {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, hashRefreshToken(token)))
  }
  clearRefreshCookie(response)
  response.status(204).send()
})

router.get('/verify-email', async (request, response) => {
  const token = typeof request.query.token === 'string' ? request.query.token : ''
  if (!token) {
    response.status(400).json({ error: 'Verification token is required' })
    return
  }
  const [verificationToken] = await db
    .select({ id: emailVerificationTokens.id, userId: emailVerificationTokens.userId })
    .from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.tokenHash, hashRecoveryToken(token)), isNull(emailVerificationTokens.usedAt), gt(emailVerificationTokens.expiresAt, new Date())))
  if (!verificationToken) {
    response.status(400).json({ error: 'This verification link is invalid, expired, or already used' })
    return
  }
  await db.transaction(async (transaction) => {
    await transaction.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, verificationToken.userId))
    await transaction.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, verificationToken.id))
  })
  response.json({ message: 'Email verified successfully' })
})

router.get('/me', requireAuth, async (request, response) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, request.user!.userId) })
  if (!user) {
    response.status(404).json({ error: 'User not found' })
    return
  }
  response.json({ id: user.id, organizationId: user.organizationId, email: user.email, role: user.role, emailVerifiedAt: user.emailVerifiedAt })
})

export default router