import { eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { analyticsCache, organizations, transactions, users } from '../db/schema'
import { logAudit } from '../audit'

const incomeExpression = sql<string>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END), 0)`
const expenseExpression = sql<string>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END), 0)`
const netExpression = sql<string>`COALESCE(SUM(${transactions.amount}), 0)`

export type AnalyticsSummary = { totalIncome: number; totalExpenses: number; net: number }

export async function calculateOrganizationSummary(organizationId: number): Promise<AnalyticsSummary> {
  const [summary] = await db
    .select({ totalIncome: incomeExpression, totalExpenses: expenseExpression, net: netExpression })
    .from(transactions)
    .where(eq(transactions.organizationId, organizationId))
  return {
    totalIncome: Number(summary?.totalIncome ?? 0),
    totalExpenses: Number(summary?.totalExpenses ?? 0),
    net: Number(summary?.net ?? 0),
  }
}

export async function refreshOrganizationSummary(organizationId: number) {
  const summary = await calculateOrganizationSummary(organizationId)
  await db
    .insert(analyticsCache)
    .values({ organizationId, totalIncome: summary.totalIncome.toString(), totalExpenses: summary.totalExpenses.toString(), net: summary.net.toString() })
    .onConflictDoUpdate({
      target: analyticsCache.organizationId,
      set: { totalIncome: summary.totalIncome.toString(), totalExpenses: summary.totalExpenses.toString(), net: summary.net.toString(), computedAt: new Date() },
    })
  return summary
}

export async function runAnalyticsSync(organizationIds: number[], actorByOrganization: Map<number, number>) {
  const startedAt = Date.now()
  for (const organizationId of organizationIds) {
    await refreshOrganizationSummary(organizationId)
  }
  const durationMs = Date.now() - startedAt
  for (const organizationId of organizationIds) {
    const userId = actorByOrganization.get(organizationId)
    if (userId) {
      await logAudit({ organizationId, userId, action: 'system.sync', entityType: 'system', entityId: null, metadata: { organizationsProcessed: organizationIds.length, durationMs } })
    }
  }
  return { organizationsProcessed: organizationIds.length, durationMs }
}

export async function runAllOrganizationsSync() {
  const organizationsWithUsers = await db
    .select({ organizationId: organizations.id, userId: users.id })
    .from(organizations)
    .innerJoin(users, eq(users.organizationId, organizations.id))
  const actorByOrganization = new Map<number, number>()
  for (const row of organizationsWithUsers) {
    if (!actorByOrganization.has(row.organizationId)) actorByOrganization.set(row.organizationId, row.userId)
  }
  return runAnalyticsSync([...actorByOrganization.keys()], actorByOrganization)
}

export async function getCachedOrganizationSummary(organizationId: number) {
  const [cached] = await db.select().from(analyticsCache).where(eq(analyticsCache.organizationId, organizationId))
  return cached ? { totalIncome: Number(cached.totalIncome), totalExpenses: Number(cached.totalExpenses), net: Number(cached.net), computedAt: cached.computedAt } : null
}

export async function invalidateOrganizationSummary(organizationId: number) {
  await db.delete(analyticsCache).where(eq(analyticsCache.organizationId, organizationId))
}