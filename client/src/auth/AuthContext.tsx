import { createContext, useContext, useEffect, useState } from 'react'

type User = { id: number; organizationId: number; email: string; role: 'owner' | 'admin' | 'member'; emailVerifiedAt: string | null }
type SignupInput = { email: string; password: string; organizationName: string }
export type ImportResult = { imported: number; failed: number; errors: Array<{ row: number; issues: string[]; values?: Record<string, unknown> }> }
export type Budget = { id: number; category: string; monthlyLimit: number; actualSpend: number; overBudget: boolean; percentUsed: number; createdAt: string }
export type AuditLog = { id: number; organizationId: number; userId: number; userEmail: string; action: string; entityType: string; entityId: number | null; metadata: Record<string, unknown> | null; createdAt: string }
export type Transaction = { id: number; date: string; description: string; amount: number; category: string }
export type TransactionList = { rows: Transaction[]; total: number; page: number; limit: number; totalPages: number }
export type TransactionInput = { date: string; description: string; amount: number; category: string }
type AuthContextValue = { user: User | null; accessToken: string | null; loading: boolean; login: (email: string, password: string) => Promise<void>; signup: (input: SignupInput) => Promise<void>; forgotPassword: (email: string) => Promise<void>; resetPassword: (token: string, password: string) => Promise<void>; resendVerification: () => Promise<string>; verifyEmail: (token: string) => Promise<void>; uploadTransactions: (file: File) => Promise<ImportResult>; fetchAnalytics: <T>(path: string) => Promise<T>; fetchTransactions: (query: string) => Promise<TransactionList>; updateTransaction: (id: number, input: Partial<TransactionInput>) => Promise<Transaction>; deleteTransaction: (id: number) => Promise<void>; fetchBudgets: () => Promise<Budget[]>; createBudget: (input: { category: string; monthly_limit: number }) => Promise<Budget>; fetchAuditLogs: () => Promise<AuditLog[]>; downloadFile: (path: string) => Promise<void>; logout: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)
const API_URL = 'http://localhost:5000/api'

async function request(path: string, options?: RequestInit) { const headers = new Headers(options?.headers); if (!(options?.body instanceof FormData)) headers.set('Content-Type', 'application/json'); const response = await fetch(`${API_URL}${path}`, { ...options, credentials: 'include', headers }); const data = response.status === 204 ? null : await response.json(); if (!response.ok) throw new Error(data?.error ?? 'Request failed'); return data }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null); const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true)
  async function loadUser(token: string) { const data = await request('/auth/me', { headers: { Authorization: `Bearer ${token}` } }); setUser(data) }
  useEffect(() => { request('/auth/refresh', { method: 'POST' }).then((data) => { setAccessToken(data.accessToken); return loadUser(data.accessToken) }).catch(() => undefined).finally(() => setLoading(false)) }, [])
  async function authenticate(path: string, body: object) { const data = await request(path, { method: 'POST', body: JSON.stringify(body) }); setAccessToken(data.accessToken); await loadUser(data.accessToken) }
  async function forgotPassword(email: string) { await request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }) }
  async function resetPassword(token: string, password: string) { await request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }) }
  async function resendVerification() { const data = await request('/auth/resend-verification', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }); return data.message as string }
  async function verifyEmail(token: string) { await request(`/auth/verify-email?token=${encodeURIComponent(token)}`); if (accessToken) await loadUser(accessToken) }
  async function uploadTransactions(file: File) { const formData = new FormData(); formData.append('file', file); return request('/transactions/import', { method: 'POST', body: formData, headers: { Authorization: `Bearer ${accessToken}` } }) as Promise<ImportResult> }
  async function fetchAnalytics<T>(path: string) { return request(`/analytics/${path}`, { headers: { Authorization: `Bearer ${accessToken}` } }) as Promise<T> }
  async function fetchTransactions(query: string) { return request(`/transactions${query}`, { headers: { Authorization: `Bearer ${accessToken}` } }) as Promise<TransactionList> }
  async function updateTransaction(id: number, input: Partial<TransactionInput>) { return request(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(input), headers: { Authorization: `Bearer ${accessToken}` } }) as Promise<Transaction> }
  async function deleteTransaction(id: number) { await request(`/transactions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }) }
  async function fetchBudgets() { return request('/budgets', { headers: { Authorization: `Bearer ${accessToken}` } }) as Promise<Budget[]> }
  async function createBudget(input: { category: string; monthly_limit: number }) { return request('/budgets', { method: 'POST', body: JSON.stringify(input), headers: { Authorization: `Bearer ${accessToken}` } }) as Promise<Budget> }
  async function fetchAuditLogs() { return request('/audit-logs', { headers: { Authorization: `Bearer ${accessToken}` } }) as Promise<AuditLog[]> }
  async function downloadFile(path: string) {
    const response = await fetch(`${API_URL}${path}`, { credentials: 'include', headers: { Authorization: `Bearer ${accessToken}` } })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error ?? 'Download failed')
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] ?? 'download'
    link.click()
    URL.revokeObjectURL(url)
  }
  async function logout() {
    await request('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => undefined)
    setAccessToken(null); setUser(null)
  }
  return <AuthContext.Provider value={{ user, accessToken, loading, login: (email, password) => authenticate('/auth/login', { email, password }), signup: (input) => authenticate('/auth/signup', input), forgotPassword, resetPassword, resendVerification, verifyEmail, uploadTransactions, fetchAnalytics, fetchTransactions, updateTransaction, deleteTransaction, fetchBudgets, createBudget, fetchAuditLogs, downloadFile, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within AuthProvider'); return context }