import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const from = process.env.RESEND_FROM_EMAIL ?? 'FinanceFlow <onboarding@resend.dev>'

export async function sendPasswordResetEmail(email: string, token: string) {
  const result = await resend.emails.send({
    from,
    to: email,
    subject: 'Reset your FinanceFlow password',
    html: `<p>We received a request to reset your FinanceFlow password.</p><p><a href="http://localhost:5174/reset-password?token=${encodeURIComponent(token)}">Reset your password</a></p><p>This link expires in 30 minutes.</p>`,
  })
  return result.data?.id ?? null
}

export async function sendVerificationEmail(email: string, token: string) {
  const result = await resend.emails.send({
    from,
    to: email,
    subject: 'Verify your FinanceFlow email',
    html: `<p>Welcome to FinanceFlow.</p><p><a href="http://localhost:5174/verify-email?token=${encodeURIComponent(token)}">Verify your email address</a></p><p>This link expires in 24 hours.</p>`,
  })
  return result.data?.id ?? null
}
