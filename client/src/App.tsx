import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth, type AuditLog, type Budget, type ImportResult } from './auth/AuthContext.tsx'
import { ProtectedRoute } from './auth/ProtectedRoute.tsx'

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    try { await login(email, password); navigate('/dashboard') } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to log in') }
  }

  return (
    <AuthForm title="Welcome back" submitLabel="Log in" onSubmit={submit} email={email} password={password} setEmail={setEmail} setPassword={setPassword} error={error} footer={<><Link to="/forgot-password">Forgot password?</Link><span className="mx-2">|</span><span>New here?</span> <Link to="/signup">Create an account</Link></>} />
  )
}

function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('')
    try { await forgotPassword(email); setMessage('If an account exists for that email, a reset link has been sent.') } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to send reset email') }
  }
  return <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100"><form onSubmit={submit} className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8"><Link to="/login" className="text-sm text-emerald-400">Back to login</Link><p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">FinanceFlow</p><h1 className="mt-4 text-3xl font-bold">Reset your password</h1><p className="mt-4 text-slate-400">Enter your email and we will send a reset link if an account exists.</p><label className="mt-8 block text-sm">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>{message && <p className="mt-4 text-sm text-emerald-400">{message}</p>}{error && <p className="mt-4 text-sm text-rose-400">{error}</p>}<button className="mt-8 w-full rounded-lg bg-emerald-400 px-4 py-3 font-bold text-slate-950">Send reset link</button></form></main>
}

function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('')
    try { await resetPassword(token, password); navigate('/login') } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to reset password') }
  }
  return <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100"><form onSubmit={submit} className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8"><p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">FinanceFlow</p><h1 className="mt-4 text-3xl font-bold">Choose a new password</h1><label className="mt-8 block text-sm">New password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>{error && <p className="mt-4 text-sm text-rose-400">{error}</p>}<button disabled={!token} className="mt-8 w-full rounded-lg bg-emerald-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">Set new password</button></form></main>
}

function SignupPage() {
  const { signup } = useAuth(); const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', organizationName: '' }); const [error, setError] = useState('')
  async function submit(event: React.FormEvent) { event.preventDefault(); try { await signup(form); navigate('/dashboard') } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to sign up') } }
  return <AuthForm title="Create your workspace" submitLabel="Sign up" onSubmit={submit} email={form.email} password={form.password} setEmail={(email) => setForm({ ...form, email })} setPassword={(password) => setForm({ ...form, password })} organizationName={form.organizationName} setOrganizationName={(organizationName) => setForm({ ...form, organizationName })} error={error} footer={<><span>Already have an account?</span> <Link to="/login">Log in</Link></>} />
}

function AuthForm({ title, submitLabel, onSubmit, email, password, setEmail, setPassword, organizationName, setOrganizationName, error, footer }: { title: string; submitLabel: string; onSubmit: (event: React.FormEvent) => void; email: string; password: string; setEmail: (value: string) => void; setPassword: (value: string) => void; organizationName?: string; setOrganizationName?: (value: string) => void; error: string; footer: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100"><form onSubmit={onSubmit} className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"><p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">FinanceFlow</p><h1 className="mt-4 text-3xl font-bold">{title}</h1>{organizationName !== undefined && <label className="mt-8 block text-sm">Organization name<input required value={organizationName} onChange={(event) => setOrganizationName?.(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>}<label className="mt-6 block text-sm">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label><label className="mt-6 block text-sm">Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>{error && <p className="mt-4 text-sm text-rose-400">{error}</p>}<button className="mt-8 w-full rounded-lg bg-emerald-400 px-4 py-3 font-bold text-slate-950">{submitLabel}</button><p className="mt-6 text-center text-sm text-slate-400">{footer}</p></form></main>
}

function ImportPage() {
  const { uploadTransactions } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!file) { setError('Choose a CSV file first'); return }
    setError(''); setResult(null); setUploading(true)
    try { setResult(await uploadTransactions(file)) } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Unable to import CSV') } finally { setUploading(false) }
  }

  return <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><div className="mx-auto max-w-3xl"><Link to="/dashboard" className="text-sm text-emerald-400">Back to dashboard</Link><p className="mt-10 text-sm uppercase tracking-[0.3em] text-emerald-400">FinanceFlow</p><h1 className="mt-4 text-4xl font-bold">Import transactions</h1><p className="mt-4 text-slate-400">Upload a CSV with date, description, amount, and category columns.</p><form onSubmit={submit} className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"><input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:font-bold file:text-slate-950" /><button disabled={uploading} className="mt-6 rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload CSV'}</button>{error && <p className="mt-4 text-sm text-rose-400">{error}</p>}</form>{result && <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"><div className="grid grid-cols-2 gap-4 sm:grid-cols-3"><Summary label="Imported" value={result.imported} /><Summary label="Failed" value={result.failed} /></div>{result.errors.length > 0 && <div className="mt-6 space-y-3">{result.errors.map((item) => <div key={`${item.row}-${item.issues.join('-')}`} className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-4 text-sm"><p className="font-semibold text-rose-300">Row {item.row}</p><p className="mt-1 text-rose-200">{item.issues.join('; ')}</p></div>)}</div>}</section>}</div></main>
}

function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-slate-800 bg-slate-950 p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div> }

function BudgetsPage() {
  const { fetchBudgets, createBudget } = useAuth()
  const queryClient = useQueryClient()
  const [category, setCategory] = useState('')
  const [monthlyLimit, setMonthlyLimit] = useState('')
  const [error, setError] = useState('')
  const budgets = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgets })
  const create = useMutation({ mutationFn: createBudget, onSuccess: () => { setCategory(''); setMonthlyLimit(''); setError(''); void queryClient.invalidateQueries({ queryKey: ['budgets'] }) }, onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : 'Unable to create budget') })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const limit = Number(monthlyLimit)
    if (!category.trim() || !Number.isFinite(limit) || limit <= 0) { setError('Enter a category and a positive monthly limit'); return }
    create.mutate({ category: category.trim(), monthly_limit: limit })
  }

  return <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><div className="mx-auto max-w-4xl"><Link to="/dashboard" className="text-sm text-emerald-400">Back to dashboard</Link><header className="mt-10"><p className="text-sm uppercase tracking-[0.3em] text-emerald-400">FinanceFlow</p><h1 className="mt-4 text-4xl font-bold">Budget monitoring</h1><p className="mt-4 text-slate-400">Track current-month transaction activity against category limits.</p></header><form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:grid-cols-[1fr_12rem_auto] sm:items-end"><label className="text-sm">Category<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Software" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label><label className="text-sm">Monthly limit<input type="number" min="0.01" step="0.01" value={monthlyLimit} onChange={(event) => setMonthlyLimit(event.target.value)} placeholder="100.00" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label><button disabled={create.isPending} className="rounded-lg bg-emerald-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{create.isPending ? 'Saving...' : 'Add budget'}</button>{error && <p className="text-sm text-rose-400 sm:col-span-3">{error}</p>}</form>{budgets.isLoading && <p className="mt-8 text-slate-400">Loading budgets...</p>}{budgets.error && <p className="mt-8 text-rose-400">Unable to load budgets.</p>}<section className="mt-8 space-y-4">{budgets.data?.map((budget) => <BudgetRow key={budget.id} budget={budget} />)}{budgets.data?.length === 0 && <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">No budgets yet.</p>}</section></div></main>
}

function BudgetRow({ budget }: { budget: Budget }) { const progressWidth = Math.min(budget.percentUsed, 100); return <article className={`rounded-2xl border p-6 ${budget.overBudget ? 'border-rose-900/70 bg-rose-950/20' : 'border-slate-800 bg-slate-900'}`}><div className="flex flex-wrap items-baseline justify-between gap-3"><div><h2 className="text-xl font-semibold">{budget.category}</h2><p className="mt-1 text-sm text-slate-400">${budget.actualSpend.toFixed(2)} of ${budget.monthlyLimit.toFixed(2)} used this month</p></div><p className={`font-bold ${budget.overBudget ? 'text-rose-400' : 'text-emerald-400'}`}>{budget.percentUsed.toFixed(2)}% {budget.overBudget ? 'over budget' : 'used'}</p></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${budget.overBudget ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${progressWidth}%` }} /></div></article> }

function AuditLogsPage() {
  const { fetchAuditLogs } = useAuth()
  const auditLogs = useQuery({ queryKey: ['audit-logs'], queryFn: fetchAuditLogs })
  return <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><div className="mx-auto max-w-6xl"><Link to="/dashboard" className="text-sm text-emerald-400">Back to dashboard</Link><header className="mt-10"><p className="text-sm uppercase tracking-[0.3em] text-emerald-400">FinanceFlow</p><h1 className="mt-4 text-4xl font-bold">Audit logs</h1><p className="mt-4 text-slate-400">Recent activity for your organization.</p></header>{auditLogs.isLoading && <p className="mt-8 text-slate-400">Loading audit logs...</p>}{auditLogs.error && <p className="mt-8 text-rose-400">Unable to load audit logs.</p>}{auditLogs.data && <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-slate-800 text-slate-400"><tr><th className="px-6 py-4 font-medium">Timestamp</th><th className="px-6 py-4 font-medium">User</th><th className="px-6 py-4 font-medium">Action</th><th className="px-6 py-4 font-medium">Summary</th></tr></thead><tbody>{auditLogs.data.map((log) => <AuditRow key={log.id} log={log} />)}</tbody></table>{auditLogs.data.length === 0 && <p className="p-8 text-center text-slate-400">No audit activity yet.</p>}</div>}</div></main>
}

function AuditRow({ log }: { log: AuditLog }) { return <tr className="border-b border-slate-800 last:border-0"><td className="whitespace-nowrap px-6 py-4 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td><td className="px-6 py-4">{log.userEmail}</td><td className="px-6 py-4 font-mono text-emerald-300">{log.action}</td><td className="px-6 py-4 text-slate-300">{formatMetadata(log.metadata)}</td></tr> }

function formatMetadata(metadata: Record<string, unknown> | null) { if (!metadata) return 'No additional details'; return Object.entries(metadata).map(([key, value]) => `${key}: ${String(value)}`).join(' | ') }

type SummaryData = { totalIncome: number; totalExpenses: number; net: number }
type CategoryData = { category: string; total: number }
type TrendData = { month: string; totalIncome: number; totalExpenses: number; net: number }

function Dashboard() {
  const { user, logout, fetchAnalytics, downloadFile } = useAuth()
  const [downloadError, setDownloadError] = useState('')
  const [downloading, setDownloading] = useState('')
  const summary = useQuery({ queryKey: ['analytics', 'summary'], queryFn: () => fetchAnalytics<SummaryData>('summary') })
  const categories = useQuery({ queryKey: ['analytics', 'by-category'], queryFn: () => fetchAnalytics<CategoryData[]>('by-category') })
  const trend = useQuery({ queryKey: ['analytics', 'trend'], queryFn: () => fetchAnalytics<TrendData[]>('trend') })
  const isLoading = summary.isLoading || categories.isLoading || trend.isLoading
  const error = summary.error ?? categories.error ?? trend.error

  async function download(path: string) {
    setDownloadError(''); setDownloading(path)
    try { await downloadFile(path) } catch (downloadError) { setDownloadError(downloadError instanceof Error ? downloadError.message : 'Download failed') } finally { setDownloading('') }
  }

  return <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm uppercase tracking-[0.3em] text-emerald-400">FinanceFlow</p><h1 className="mt-4 text-4xl font-bold">Your dashboard</h1><p className="mt-4 text-slate-400">Signed in as {user?.email} ({user?.role}).</p></div><div className="flex flex-wrap gap-3"><Link to="/budgets" className="rounded-lg border border-emerald-400 px-4 py-2 text-emerald-300">Budgets</Link><Link to="/audit-logs" className="rounded-lg border border-slate-600 px-4 py-2 text-slate-300">Audit logs</Link><Link to="/transactions/import" className="rounded-lg bg-emerald-400 px-4 py-2 font-bold text-slate-950">Import transactions</Link><button onClick={() => void download('/reports/summary-pdf')} disabled={downloading !== ''} className="rounded-lg border border-sky-400 px-4 py-2 text-sky-300 disabled:opacity-50">{downloading === '/reports/summary-pdf' ? 'Generating...' : 'Download PDF Report'}</button><button onClick={() => void download('/transactions/export')} disabled={downloading !== ''} className="rounded-lg border border-slate-600 px-4 py-2 text-slate-300 disabled:opacity-50">{downloading === '/transactions/export' ? 'Exporting...' : 'Export Transactions CSV'}</button><button onClick={() => void logout()} className="rounded-lg border border-slate-700 px-4 py-2">Log out</button></div></header>{!user?.emailVerifiedAt && <p className="mt-6 rounded-lg border border-amber-700 bg-amber-950/30 p-4 text-amber-200">Please verify your email address to secure your account.</p>}{downloadError && <p className="mt-4 text-rose-400">{downloadError}</p>}{isLoading && <p className="mt-10 text-slate-400">Loading analytics...</p>}{error && <p className="mt-10 text-rose-400">Unable to load analytics: {error instanceof Error ? error.message : 'Request failed'}</p>}{!isLoading && !error && summary.data && <><section className="mt-10 grid gap-4 sm:grid-cols-3"><MetricCard label="Total income" value={summary.data.totalIncome} tone="text-emerald-400" /><MetricCard label="Total expenses" value={summary.data.totalExpenses} tone="text-amber-300" /><MetricCard label="Net" value={summary.data.net} tone={summary.data.net >= 0 ? 'text-sky-300' : 'text-rose-400'} /></section><section className="mt-6 grid gap-6 lg:grid-cols-2"><ChartPanel title="Spend by category"><ResponsiveContainer width="100%" height={300}><BarChart data={categories.data}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="category" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} /><Bar dataKey="total" fill="#34d399" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></ChartPanel><ChartPanel title="Monthly trend"><ResponsiveContainer width="100%" height={300}><LineChart data={trend.data}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="month" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} /><Legend /><Line type="monotone" dataKey="totalIncome" name="Income" stroke="#34d399" strokeWidth={2} /><Line type="monotone" dataKey="totalExpenses" name="Expenses" stroke="#fbbf24" strokeWidth={2} /><Line type="monotone" dataKey="net" name="Net" stroke="#7dd3fc" strokeWidth={2} /></LineChart></ResponsiveContainer></ChartPanel></section></>}</div></main>
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="text-sm text-slate-400">{label}</p><p className={`mt-3 text-3xl font-bold ${tone}`}>{value.toFixed(2)}</p></div> }

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-6 text-xl font-semibold">{title}</h2>{children}</section> }

function App() { return <BrowserRouter><Routes><Route path="/login" element={<LoginPage />} /><Route path="/signup" element={<SignupPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/reset-password" element={<ResetPasswordPage />} /><Route element={<ProtectedRoute />}><Route path="/dashboard" element={<Dashboard />} /><Route path="/budgets" element={<BudgetsPage />} /><Route path="/audit-logs" element={<AuditLogsPage />} /><Route path="/transactions/import" element={<ImportPage />} /></Route><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></BrowserRouter> }

export default App
