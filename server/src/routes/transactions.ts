import multer, { MulterError } from 'multer'
import Papa from 'papaparse'
import { and, asc, count, desc, eq, gte, ilike, lte } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/client'
import { transactions } from '../db/schema'
import { logAudit } from '../audit'
import { invalidateOrganizationSummary } from '../services/analytics'
import { requireAuth } from '../middleware/requireAuth'
import { logger } from '../logger'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const isCsvExtension = file.originalname.toLowerCase().endsWith('.csv')
    const isCsvMimeType = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.mimetype.toLowerCase())
    if (!isCsvExtension || !isCsvMimeType) {
      callback(new Error('Only CSV files with a .csv extension are accepted'))
      return
    }
    callback(null, true)
  },
})

function uploadCsv(request: Parameters<typeof upload.single>[0] extends never ? never : import('express').Request, response: import('express').Response, next: import('express').NextFunction) {
  upload.single('file')(request, response, (error) => {
    if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
      response.status(413).json({ imported: 0, failed: 0, errors: [{ row: 0, issues: ['CSV file must be 5MB or smaller'] }] })
      return
    }
    if (error) {
      response.status(400).json({ imported: 0, failed: 0, errors: [{ row: 0, issues: [error.message] }] })
      return
    }
    next()
  })
}

const transactionRowSchema = z.object({
  date: z.string().trim().min(1).refine((value) => !Number.isNaN(Date.parse(value)), 'Date must be valid'),
  description: z.string().trim().min(1, 'Description must not be empty'),
  amount: z.preprocess(
    (value) => {
      if (typeof value === 'number') return value
      if (typeof value !== 'string' || value.trim() === '') return Number.NaN
      return Number(value)
    },
    z.number().finite('Amount must be a number'),
  ),
  category: z.string().trim().min(1, 'Category must not be empty'),
})

const transactionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must use YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must use YYYY-MM-DD').optional(),
  sortBy: z.enum(['date', 'amount']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

router.get('/', requireAuth, async (request, response) => {
  const parsedQuery = transactionListQuerySchema.safeParse(request.query)
  if (!parsedQuery.success) {
    response.status(400).json({ error: parsedQuery.error.issues[0]?.message ?? 'Invalid transaction query' })
    return
  }

  const { page, limit, search, category, startDate, endDate, sortBy, sortOrder } = parsedQuery.data
  const organizationId = request.user!.organizationId
  const conditions = [eq(transactions.organizationId, organizationId)]
  if (search) conditions.push(ilike(transactions.description, `%${search}%`))
  if (category) conditions.push(eq(transactions.category, category))
  if (startDate) conditions.push(gte(transactions.date, startDate))
  if (endDate) conditions.push(lte(transactions.date, endDate))
  const where = and(...conditions)
  const sortColumn = sortBy === 'amount' ? transactions.amount : transactions.date
  const order = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: transactions.id, date: transactions.date, description: transactions.description, amount: transactions.amount, category: transactions.category })
      .from(transactions)
      .where(where)
      .orderBy(order, sortOrder === 'asc' ? asc(transactions.id) : desc(transactions.id))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(transactions).where(where),
  ])

  response.json({
    rows: rows.map((row) => ({ ...row, amount: Number(row.amount) })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})

router.get('/import-template', requireAuth, (_request, response) => {
  // Three example rows: income (positive), two expenses (negative)
  // These rows are intentionally valid so a user can upload them as-is to test the import flow
  const csv = Papa.unparse(
    [
      { date: '2025-01-15', description: 'Salary payment', amount: 3500, category: 'Income' },
      { date: '2025-01-18', description: 'Grocery shopping', amount: -87.5, category: 'Food' },
      { date: '2025-01-20', description: 'Monthly rent', amount: -1200, category: 'Housing' },
    ],
    { columns: ['date', 'description', 'amount', 'category'] },
  )
  response.setHeader('Content-Type', 'text/csv; charset=utf-8')
  response.setHeader('Content-Disposition', 'attachment; filename="financeflow-import-template.csv"')
  response.send(csv)
})

router.post('/import', requireAuth, uploadCsv, async (request, response) => {
  if (!request.file) {
    response.status(400).json({ imported: 0, failed: 0, errors: [{ row: 0, issues: ['A CSV file is required'] }] })
    return
  }

  const parsed = Papa.parse<Record<string, unknown>>(request.file.buffer.toString('utf8'), {
    header: true,
    skipEmptyLines: 'greedy',
  })
  const errors: Array<{ row: number; issues: string[]; values?: Record<string, unknown> }> = parsed.errors.map((error) => ({
    row: (error.row ?? 0) + 2,
    issues: [error.message],
  }))
  const validRows: Array<{ date: string; description: string; amount: number; category: string }> = []

  parsed.data.forEach((row, index) => {
    const result = transactionRowSchema.safeParse(row)
    if (!result.success) {
      errors.push({
        row: index + 2,
        issues: result.error.issues.map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`),
        values: row,
      })
      return
    }
    validRows.push(result.data)
  })

  if (validRows.length > 0) {
    await db.insert(transactions).values(
      validRows.map((row) => ({
        organizationId: request.user!.organizationId,
        date: row.date,
        description: row.description,
        amount: row.amount.toString(),
        category: row.category,
      })),
    )
    await invalidateOrganizationSummary(request.user!.organizationId)
  }

  try {
    await logAudit({
      organizationId: request.user!.organizationId,
      userId: request.user!.userId,
      action: 'transaction.import',
      entityType: 'transaction',
      metadata: { imported: validRows.length, failed: errors.length },
    })
  } catch (auditError) {
    logger.error({ err: auditError, organizationId: request.user!.organizationId, userId: request.user!.userId }, 'failed to write transaction import audit log')
  }
  response.json({ imported: validRows.length, failed: errors.length, errors })
})

router.get('/export', requireAuth, async (request, response) => {
  const organizationId = request.user!.organizationId
  const rows = await db
    .select({ date: transactions.date, description: transactions.description, amount: transactions.amount, category: transactions.category })
    .from(transactions)
    .where(eq(transactions.organizationId, organizationId))
    .orderBy(asc(transactions.date), asc(transactions.id))
  const csv = Papa.unparse(rows.map((row) => ({ ...row, amount: Number(row.amount) })), { columns: ['date', 'description', 'amount', 'category'] })

  try {
    await logAudit({ organizationId, userId: request.user!.userId, action: 'transaction.export', entityType: 'transaction', metadata: { format: 'csv', rowCount: rows.length } })
  } catch (auditError) {
    logger.error({ err: auditError, organizationId, userId: request.user!.userId }, 'failed to write transaction export audit log')
  }
  response.setHeader('Content-Type', 'text/csv; charset=utf-8')
  response.setHeader('Content-Disposition', 'attachment; filename="financeflow-transactions.csv"')
  response.send(csv)
})

export default router
