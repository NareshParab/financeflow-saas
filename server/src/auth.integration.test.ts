import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { eq, inArray, sql } from 'drizzle-orm'
import { app } from './app'
import { db, pool } from './db/client'
import { createAccessToken, hashPassword } from './auth'
import { authRateLimit } from './middleware/authRateLimit'
import { auditLogs, budgets, organizations, transactions, users } from './db/schema'

const http = request(app)
const createdOrganizationIds: number[] = []
let sequence = 0

async function createTestUser(label: string) {
  sequence += 1
  const [organization] = await db.insert(organizations).values({ name: `Integration ${label} ${Date.now()}-${sequence}` }).returning()
  const email = `integration.${label}.${Date.now()}.${sequence}@example.com`
  const [user] = await db.insert(users).values({
    organizationId: organization.id,
    email,
    passwordHash: await hashPassword('CorrectPassword123!'),
    role: 'owner',
  }).returning()
  createdOrganizationIds.push(organization.id)
  return {
    organizationId: organization.id,
    userId: user.id,
    email,
    password: 'CorrectPassword123!',
    accessToken: createAccessToken({ userId: user.id, organizationId: organization.id, role: 'owner' }),
  }
}

async function status(response: Promise<{ status: number }>) {
  return (await response).status
}

describe('FinanceFlow integration API', () => {
  beforeAll(async () => {
    await db.execute(sql`select 1`)
  })

  beforeEach(() => {
    authRateLimit.resetKey('::ffff:127.0.0.1')
    authRateLimit.resetKey('127.0.0.1')
  })

  afterAll(async () => {
    if (createdOrganizationIds.length > 0) {
      await db.delete(organizations).where(inArray(organizations.id, createdOrganizationIds))
    }
    await pool.end()
  })

  it('signs up a user and organization, then rejects duplicate email', async () => {
    const email = `signup.${Date.now()}@example.com`
    const body = { email, password: 'SignupPassword123!', organizationName: 'Signup Integration Org' }
    const signup = await http.post('/api/auth/signup').send(body)
    expect(signup.status).toBe(200)
    const [createdUser] = await db.select().from(users).where(eq(users.email, email))
    expect(createdUser).toBeDefined()
    expect(createdUser.email).toBe(email)
    createdOrganizationIds.push(createdUser.organizationId)

    const duplicate = await http.post('/api/auth/signup').send(body)
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.error).toBe('Email is already registered')
  })

  it('logs in with correct credentials and rejects wrong credentials', async () => {
    const user = await createTestUser('login')
    const success = await http.post('/api/auth/login').send({ email: user.email, password: user.password })
    expect(success.status).toBe(200)
    expect(success.body.accessToken).toEqual(expect.any(String))

    const failure = await http.post('/api/auth/login').send({ email: user.email, password: 'WrongPassword123!' })
    expect(failure.status).toBe(401)
  })

  it('requireAuth rejects missing and invalid access tokens', async () => {
    expect(await status(http.get('/api/analytics/summary'))).toBe(401)
    expect(await status(http.get('/api/analytics/summary').set('Authorization', 'Bearer invalid-token'))).toBe(401)
  })

  it('reports database health and hides parser internals from error responses', async () => {
    const health = await http.get('/api/health')
    expect(health.status).toBe(200)
    expect(health.body).toEqual({ status: 'ok', database: 'ok' })

    const malformed = await http
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
    expect(malformed.status).toBe(400)
    expect(malformed.body).toEqual({ error: 'Request failed' })
  })

  it('isolates transactions, budgets, and audit logs by organization', async () => {
    const orgA = await createTestUser('isolation-a')
    const orgB = await createTestUser('isolation-b')
    const today = new Date().toISOString().slice(0, 10)
    await db.insert(transactions).values({ organizationId: orgB.organizationId, date: today, description: 'Org B secret', amount: '-90.00', category: 'Private' })
    await db.insert(budgets).values({ organizationId: orgB.organizationId, category: 'Private', monthlyLimit: '100.00' })
    await db.insert(auditLogs).values({ organizationId: orgB.organizationId, userId: orgB.userId, action: 'private.test', entityType: 'test', metadata: {} })

    const categories = await http.get('/api/analytics/by-category').set('Authorization', `Bearer ${orgA.accessToken}`)
    const orgABudgets = await http.get('/api/budgets').set('Authorization', `Bearer ${orgA.accessToken}`)
    const orgAAuditLogs = await http.get('/api/audit-logs').set('Authorization', `Bearer ${orgA.accessToken}`)
    expect(categories.status).toBe(200)
    expect(categories.body).toEqual([])
    expect(orgABudgets.body).toEqual([])
    expect(orgAAuditLogs.body).toEqual([])

    const imported = await http
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${orgA.accessToken}`)
      .attach('file', Buffer.from(`date,description,amount,category\n${today},Org A income,25,Sales`), 'org-a.csv')
    expect(imported.status).toBe(200)
    const [orgATransaction] = await db.select().from(transactions).where(eq(transactions.organizationId, orgA.organizationId))
    expect(orgATransaction.description).toBe('Org A income')
    expect((await db.select().from(transactions).where(eq(transactions.organizationId, orgB.organizationId))).map((row) => row.description)).toEqual(['Org B secret'])
  })

  it('separates valid and invalid CSV rows', async () => {
    const user = await createTestUser('csv')
    const csv = 'date,description,amount,category\n2026-09-05,Valid row,12.50,Office\nnot-a-date,,bad,\n2026-09-06,Second valid,-4.25,Travel'
    const response = await http
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .attach('file', Buffer.from(csv), 'rows.csv')
    expect(response.status).toBe(200)
    expect(response.body.imported).toBe(2)
    expect(response.body.failed).toBe(1)
    expect(response.body.errors[0].row).toBe(3)
  })

  it('calculates budget spending and over-budget state from current-month transactions', async () => {
    const user = await createTestUser('budget')
    const today = new Date().toISOString().slice(0, 10)
    await db.insert(transactions).values([
      { organizationId: user.organizationId, date: today, description: 'Expense one', amount: '-80.00', category: 'Operations' },
      { organizationId: user.organizationId, date: today, description: 'Income', amount: '20.00', category: 'Operations' },
    ])
    const created = await http.post('/api/budgets').set('Authorization', `Bearer ${user.accessToken}`).send({ category: 'Operations', monthly_limit: 75 })
    expect(created.status).toBe(201)
    const response = await http.get('/api/budgets').set('Authorization', `Bearer ${user.accessToken}`)
    expect(response.status).toBe(200)
    expect(response.body[0]).toMatchObject({ category: 'Operations', monthlyLimit: 75, actualSpend: 100, overBudget: true, percentUsed: 133.33 })
  })

  it('rejects a refresh token after logout', async () => {
    const user = await createTestUser('logout')
    const agent = request.agent(app)
    const login = await agent.post('/api/auth/login').send({ email: user.email, password: user.password })
    expect(login.status).toBe(200)
    expect((await agent.post('/api/auth/logout')).status).toBe(204)
    expect((await agent.post('/api/auth/refresh')).status).toBe(401)
  })

  it('rate-limits authentication after ten requests from one IP', async () => {
    const responses = []
    for (let attempt = 0; attempt < 11; attempt += 1) {
      responses.push(await http.post('/api/auth/login').send({ email: 'missing-rate-limit@example.com', password: 'WrongPassword123!' }))
    }
    expect(responses.slice(0, 10).every((response) => response.status === 401)).toBe(true)
    expect(responses[10].status).toBe(429)
    expect(responses[10].body.error).toContain('Too many authentication attempts')
  })
})
