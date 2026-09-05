import { asc, desc, eq, sql } from 'drizzle-orm'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Router } from 'express'
import { db } from '../db/client'
import { logAudit } from '../audit'
import { organizations, transactions } from '../db/schema'
import { requireAuth } from '../middleware/requireAuth'
import { calculateOrganizationSummary, getCachedOrganizationSummary } from '../services/analytics'
import { logger } from '../logger'

const router = Router()

function money(value: number) {
  return value.toFixed(2)
}

function drawTableRow(page: ReturnType<PDFDocument['addPage']>, font: Awaited<ReturnType<PDFDocument['embedFont']>>, values: string[], positions: number[], y: number, size = 8) {
  values.forEach((value, index) => page.drawText(value, { x: positions[index], y, size, font }))
}

router.get('/summary-pdf', requireAuth, async (request, response) => {
  const organizationId = request.user!.organizationId
  const [organization] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, organizationId))
  const cached = await getCachedOrganizationSummary(organizationId)
  const summary = cached ?? await calculateOrganizationSummary(organizationId)
  const categoryRows = await db
    .select({ category: transactions.category, total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(eq(transactions.organizationId, organizationId))
    .groupBy(transactions.category)
    .orderBy(desc(sql`ABS(SUM(${transactions.amount}))`))
  const month = sql<string>`TO_CHAR(DATE_TRUNC('month', ${transactions.date}), 'YYYY-MM')`
  const trendRows = await db
    .select({ month, totalIncome: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END), 0)`, totalExpenses: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END), 0)`, net: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(eq(transactions.organizationId, organizationId))
    .groupBy(sql`DATE_TRUNC('month', ${transactions.date})`)
    .orderBy(asc(sql`DATE_TRUNC('month', ${transactions.date})`))

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const dark = rgb(0.12, 0.16, 0.22)
  const muted = rgb(0.35, 0.4, 0.47)
  const accent = rgb(0.05, 0.5, 0.35)
  let y = 748

  page.drawText(organization?.name ?? 'FinanceFlow organization', { x: 42, y, size: 20, font: bold, color: dark })
  y -= 22
  page.drawText('Financial summary report', { x: 42, y, size: 11, font: regular, color: muted })
  page.drawText(`Generated ${new Date().toLocaleDateString('en-US')}`, { x: 410, y, size: 9, font: regular, color: muted })
  y -= 30

  const metrics = [
    ['Income', Number(summary.totalIncome), accent],
    ['Expenses', Number(summary.totalExpenses), rgb(0.75, 0.42, 0.08)],
    ['Net', Number(summary.net), Number(summary.net) >= 0 ? rgb(0.08, 0.42, 0.72) : rgb(0.75, 0.12, 0.16)],
  ] as const
  metrics.forEach(([label, value, color], index) => {
    const x = 42 + index * 176
    page.drawRectangle({ x, y: y - 46, width: 160, height: 58, color: rgb(0.95, 0.96, 0.97) })
    page.drawText(label, { x: x + 10, y: y - 9, size: 9, font: regular, color: muted })
    page.drawText(money(value), { x: x + 10, y: y - 31, size: 15, font: bold, color })
  })
  y -= 78

  page.drawText('Category breakdown', { x: 42, y, size: 12, font: bold, color: dark })
  y -= 18
  drawTableRow(page, bold, ['Category', 'Total'], [42, 300], y, 8)
  y -= 5
  page.drawLine({ start: { x: 42, y }, end: { x: 390, y }, thickness: 0.7, color: rgb(0.75, 0.78, 0.82) })
  y -= 14
  categoryRows.slice(0, 12).forEach((row) => {
    drawTableRow(page, regular, [row.category, money(Number(row.total))], [42, 300], y)
    y -= 14
  })

  y = 458
  page.drawText('Monthly trend', { x: 42, y, size: 12, font: bold, color: dark })
  y -= 18
  drawTableRow(page, bold, ['Month', 'Income', 'Expenses', 'Net'], [42, 180, 290, 400], y, 8)
  y -= 5
  page.drawLine({ start: { x: 42, y }, end: { x: 470, y }, thickness: 0.7, color: rgb(0.75, 0.78, 0.82) })
  y -= 14
  trendRows.slice(-14).forEach((row) => {
    drawTableRow(page, regular, [row.month, money(Number(row.totalIncome)), money(Number(row.totalExpenses)), money(Number(row.net))], [42, 180, 290, 400], y)
    y -= 14
  })

  page.drawText('FinanceFlow', { x: 42, y: 30, size: 8, font: regular, color: muted })
  const bytes = await pdf.save()
  try {
    await logAudit({ organizationId, userId: request.user!.userId, action: 'report.generate', entityType: 'report', metadata: { format: 'pdf', rowCount: categoryRows.length + trendRows.length } })
  } catch (auditError) {
    logger.error({ err: auditError, organizationId, userId: request.user!.userId }, 'failed to write report audit log')
  }
  response.setHeader('Content-Type', 'application/pdf')
  response.setHeader('Content-Disposition', 'attachment; filename="financeflow-summary-report.pdf"')
  response.send(Buffer.from(bytes))
})

export default router
