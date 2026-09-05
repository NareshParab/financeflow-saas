import { Router } from 'express'
import { runAnalyticsSync } from '../services/analytics'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

router.post('/run', requireAuth, async (request, response) => {
  const organizationId = request.user!.organizationId
  const result = await runAnalyticsSync([organizationId], new Map([[organizationId, request.user!.userId]]))
  response.json(result)
})

export default router