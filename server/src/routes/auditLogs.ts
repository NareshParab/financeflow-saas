import { desc, eq } from 'drizzle-orm'
import { Router } from 'express'
import { db } from '../db/client'
import { auditLogs, users } from '../db/schema'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

router.get('/', requireAuth, async (request, response) => {
  const parsedLimit = Number(request.query.limit ?? 50)
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.floor(parsedLimit), 1), 200) : 50
  const rows = await db
    .select({
      id: auditLogs.id,
      organizationId: auditLogs.organizationId,
      userId: auditLogs.userId,
      userEmail: users.email,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.organizationId, request.user!.organizationId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)

  response.json(rows)
})

export default router