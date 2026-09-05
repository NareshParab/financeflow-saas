import { and, eq, gte, lt, sql } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/client'
import { budgets, transactions } from '../db/schema'
import { logAudit } from '../audit'
import { requireAuth } from '../middleware/requireAuth'
import { logger } from '../logger'

const router = Router()
const budgetSchema = z.object({
  category: z.string().trim().min(1, 'Category must not be empty'),
  monthly_limit: z.coerce.number().positive('Monthly limit must be a positive number'),
})

function round(value: number) {
  return Math.round(value * 100) / 100
}

function currentMonthBounds() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const nextMonth = new Date(Date.UTC(year, month + 1, 1))
  const end = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`
  return { start, end }
}

router.post('/', requireAuth, async (request, response) => {
  const parsed = budgetSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join('; ') })
    return
  }

  const [budget] = await db
    .insert(budgets)
    .values({
      organizationId: request.user!.organizationId,
      category: parsed.data.category,
      monthlyLimit: parsed.data.monthly_limit.toString(),
    })
    .returning()

  try {
    await logAudit({
      organizationId: request.user!.organizationId,
      userId: request.user!.userId,
      action: 'budget.create',
      entityType: 'budget',
      entityId: budget.id,
      metadata: { category: budget.category, monthlyLimit: Number(budget.monthlyLimit) },
    })
  } catch (auditError) {
    logger.error({ err: auditError, organizationId: request.user!.organizationId, userId: request.user!.userId }, 'failed to write budget audit log')
  }
  response.status(201).json({
    id: budget.id,
    category: budget.category,
    monthlyLimit: Number(budget.monthlyLimit),
    createdAt: budget.createdAt,
  })
})

router.get('/', requireAuth, async (request, response) => {
  const { start, end } = currentMonthBounds()
  const organizationId = request.user!.organizationId
  const budgetRows = await db.select().from(budgets).where(eq(budgets.organizationId, organizationId))
  const actualRows = await db
    .select({
      category: transactions.category,
      actualSpend: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.organizationId, organizationId),
      gte(transactions.date, start),
      lt(transactions.date, end),
    ))
    .groupBy(transactions.category)
  const actualByCategory = new Map(actualRows.map((row) => [row.category, Number(row.actualSpend)]))

  response.json(budgetRows.map((budget) => {
    const monthlyLimit = Number(budget.monthlyLimit)
    const actualSpend = actualByCategory.get(budget.category) ?? 0
    return {
      id: budget.id,
      category: budget.category,
      monthlyLimit,
      actualSpend: round(actualSpend),
      overBudget: actualSpend > monthlyLimit,
      percentUsed: round((actualSpend / monthlyLimit) * 100),
      createdAt: budget.createdAt,
    }
  }))
})

export default router