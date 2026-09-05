import { desc, eq, sql } from 'drizzle-orm'
import { Router } from 'express'
import { db } from '../db/client'
import { transactions } from '../db/schema'
import { requireAuth } from '../middleware/requireAuth'
import { calculateOrganizationSummary, getCachedOrganizationSummary } from '../services/analytics'

const router = Router()

const incomeExpression = sql<string>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END), 0)`
const expenseExpression = sql<string>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END), 0)`
const netExpression = sql<string>`COALESCE(SUM(${transactions.amount}), 0)`

router.get('/summary', requireAuth, async (request, response) => {
  const cached = await getCachedOrganizationSummary(request.user!.organizationId)
  const summary = cached ?? await calculateOrganizationSummary(request.user!.organizationId)

  response.json({
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    net: summary.net,
  })
})

router.get('/by-category', requireAuth, async (request, response) => {
  const rows = await db
    .select({
      category: transactions.category,
      total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.organizationId, request.user!.organizationId))
    .groupBy(transactions.category)
    .orderBy(desc(sql`ABS(SUM(${transactions.amount}))`))

  response.json(rows.map((row) => ({ category: row.category, total: Number(row.total) })))
})

router.get('/trend', requireAuth, async (request, response) => {
  const month = sql<string>`TO_CHAR(DATE_TRUNC('month', ${transactions.date}), 'YYYY-MM')`
  const rows = await db
    .select({
      month,
      totalIncome: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
      totalExpenses: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
      net: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.organizationId, request.user!.organizationId))
    .groupBy(sql`DATE_TRUNC('month', ${transactions.date})`)
    .orderBy(sql`DATE_TRUNC('month', ${transactions.date})`)

  response.json(rows.map((row) => ({
    month: row.month,
    totalIncome: Number(row.totalIncome),
    totalExpenses: Number(row.totalExpenses),
    net: Number(row.net),
  })))
})

export default router
