import type { ErrorRequestHandler, RequestHandler } from 'express'
import { logger } from '../logger'

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint()
  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    logger.info({
      method: request.method,
      path: request.originalUrl,
      status: response.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      userId: request.user?.userId,
      organizationId: request.user?.organizationId,
    }, 'request completed')
  })
  next()
}

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const status = typeof error?.status === 'number' && error.status >= 400 && error.status < 500 ? error.status : 500
  logger.error({
    err: {
      type: error?.name,
      message: error?.message,
      stack: error?.stack,
    },
    method: request.method,
    path: request.originalUrl,
    status,
    userId: request.user?.userId,
    organizationId: request.user?.organizationId,
  }, 'unhandled request error')
  response.status(status).json({ error: status === 500 ? 'Internal server error' : 'Request failed' })
}
