import dotenv from 'dotenv'
import path from 'node:path'
import cors from 'cors'
import express from 'express'
import { sql } from 'drizzle-orm'
import { db } from './db/client'
import { errorHandler, requestLogger } from './middleware/observability'
import authRouter from './routes/auth'
import analyticsRouter from './routes/analytics'
import auditLogsRouter from './routes/auditLogs'
import budgetsRouter from './routes/budgets'
import syncRouter from './routes/sync'
import transactionsRouter from './routes/transactions'
import reportsRouter from './routes/reports'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

export const app = express()

const trustProxy = process.env.TRUST_PROXY?.trim().toLowerCase() === 'true'
app.set('trust proxy', trustProxy)

const allowedOrigins = (process.env.CLIENT_URL ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(requestLogger)
app.use(express.json())

app.get('/api/health', async (_request, response) => {
  try {
    await db.execute(sql`select 1`)
    response.json({ status: 'ok', database: 'ok' })
  } catch {
    response.status(503).json({ status: 'degraded', database: 'unreachable' })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/audit-logs', auditLogsRouter)
app.use('/api/budgets', budgetsRouter)
app.use('/api/sync', syncRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/reports', reportsRouter)
app.use(errorHandler)
