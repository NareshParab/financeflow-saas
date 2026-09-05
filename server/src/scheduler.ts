import cron from 'node-cron'
import { runAllOrganizationsSync } from './services/analytics'
import { logger } from './logger'

export function startAnalyticsScheduler() {
  const expression = process.env.SYNC_INTERVAL_CRON || '*/5 * * * *'
  if (!cron.validate(expression)) throw new Error(`Invalid SYNC_INTERVAL_CRON: ${expression}`)
  const task = cron.schedule(expression, async () => {
    try {
      const result = await runAllOrganizationsSync()
      logger.info(result, 'analytics sync complete')
    } catch (error) {
      logger.error({ err: error }, 'analytics sync failed')
    }
  })
  logger.info({ expression }, 'analytics sync scheduled')
  return task
}