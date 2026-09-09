import rateLimit from 'express-rate-limit'

export const AUTH_RATE_LIMIT_WINDOW_MS = 2 * 60 * 60 * 1000

export const authRateLimit = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({ error: 'Too many authentication attempts. Please try again later.' })
  },
})
