import { db } from './db/client'
import { auditLogs } from './db/schema'

type AuditInput = {
  organizationId: number
  userId: number
  action: string
  entityType: string
  entityId?: number | null
  metadata?: Record<string, unknown> | null
}

export async function logAudit({ organizationId, userId, action, entityType, entityId = null, metadata = null }: AuditInput) {
  await db.insert(auditLogs).values({ organizationId, userId, action, entityType, entityId, metadata })
}