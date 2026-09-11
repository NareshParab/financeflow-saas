import rateLimit from 'express-rate-limit'

const DEFAULT_AUTH_RATE_LIMIT_MAX = 8
const DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

function positiveIntegerFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value > 0 ? value : fallback
}

export const AUTH_RATE_LIMIT_MAX = positiveIntegerFromEnv('AUTH_RATE_LIMIT_MAX', DEFAULT_AUTH_RATE_LIMIT_MAX)
export const AUTH_RATE_LIMIT_WINDOW_MS = positiveIntegerFromEnv('AUTH_RATE_LIMIT_WINDOW_MS', DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS)

export const authRateLimit = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  limit: AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({ error: 'Too many authentication attempts. Please try again later.' })
  },
})
