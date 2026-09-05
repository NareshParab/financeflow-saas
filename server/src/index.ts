import dotenv from 'dotenv'
import path from 'node:path'
import { app } from './app'
import { logger } from './logger'
import { startAnalyticsScheduler } from './scheduler'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const port = Number(process.env.PORT) || 5000

app.listen(port, () => {
  logger.info({ port }, 'FinanceFlow API listening')
  startAnalyticsScheduler()
})
