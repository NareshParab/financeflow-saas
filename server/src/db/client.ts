import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import fs from 'node:fs'
import { Pool } from 'pg'
import path from 'node:path'
import * as schema from './schema'

const envPath = fs.existsSync(path.resolve(process.cwd(), '.env'))
  ? path.resolve(process.cwd(), '.env')
  : path.resolve(process.cwd(), 'server/.env')
const fileEnv = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {}
Object.assign(process.env, fileEnv)

const databaseUrl = fileEnv.DATABASE_URL ?? process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

export const pool = new Pool({ connectionString: databaseUrl })
export const db = drizzle(pool, { schema })