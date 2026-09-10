import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth, type AuditLog, type Budget, type ImportResult, type Transaction } from './auth/AuthContext.tsx'
import { ProtectedRoute } from './auth/ProtectedRoute.tsx'
import { ThemeProvider, useTheme } from './auth/ThemeContext.tsx'
import { AppLayout, AuthLayout } from './components/Layout.tsx'
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Upload, FileText, CheckCircle, XCircle, Plus,
  Download, FileBarChart, BarChart2, ArrowRight,
  MailWarning, Clock, Shield, Activity, ClipboardList, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'

// ─── Auth pages ──────────────────────────────────────────────────────────────

function InputField({
  id, label, type = 'text', value, onChange, placeholder, required, minLength,
}: {
  id: string; label: string; type?: string; value: string; onChange: (v: string) => void
  placeholder?: string; required?: boolean; minLength?: number
}) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="input"
      />
    </div>
  )
}

function AuthCard({
  title, subtitle, submitLabel, onSubmit, children, footer, error, loading,
}: {
  title: string; subtitle?: string; submitLabel: string
  onSubmit: (e: React.FormEvent) => void; children: React.ReactNode
  footer?: React.ReactNode; error?: string; loading?: boolean
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="card p-8 shadow-xl"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>

      <div className="space-y-5">
        {children}
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <XCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <button
        type="submit"
        id={`submit-${submitLabel.toLowerCase().replace(/\s+/g, '-')}`}
        disabled={loading}
        className="btn-primary btn-lg w-full mt-6 justify-center"
      >
        {loading ? 'Please wait…' : submitLabel}
        {!loading && <ArrowRight size={16} />}
      </button>

      {footer && (
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</p>
      )}
    </form>
  )
}

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AuthCard
        title="Welcome back"
        subtitle="Sign in to your FinanceFlow workspace."
        submitLabel="Log in"
        onSubmit={submit}
        error={error}
        loading={loading}
        footer={
          <>
            <span>New here? </span>
            <Link to="/signup" id="go-to-signup" className="font-semibold text-primary-700 dark:text-teal-400 hover:underline">
              Create an account
            </Link>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <Link to="/forgot-password" id="go-to-forgot" className="text-slate-500 dark:text-slate-400 hover:underline">
              Forgot password?
            </Link>
          </>
        }
      >
        <InputField id="email" label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@company.com" required />
        <InputField id="password" label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required minLength={8} />
      </AuthCard>
    </AuthLayout>
  )
}

function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', organizationName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(''); setLoading(true)
    try {
      await signup(form)
      navigate('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AuthCard
        title="Create your workspace"
        subtitle="Get started with FinanceFlow for free."
        submitLabel="Sign up"
        onSubmit={submit}
        error={error}
        loading={loading}
        footer={
          <>
            Already have an account?{' '}
            <Link to="/login" id="go-to-login" className="font-semibold text-primary-700 dark:text-teal-400 hover:underline">
              Log in
            </Link>
          </>
        }
      >
        <InputField id="org-name" label="Organization name" value={form.organizationName} onChange={(v) => setForm({ ...form, organizationName: v })} placeholder="Acme Corp" required />
        <InputField id="email" label="Email address" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@company.com" required />
        <InputField id="password" label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Min. 8 characters" required minLength={8} />
      </AuthCard>
    </AuthLayout>
  )
}

function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(''); setLoading(true)
    try {
      await forgotPassword(email)
      setMessage('If an account exists for that email, a reset link has been sent.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AuthCard
        title="Reset your password"
        subtitle="Enter your email and we'll send a reset link if an account exists."
        submitLabel="Send reset link"
        onSubmit={submit}
        error={error}
        loading={loading}
        footer={
          <Link to="/login" id="back-to-login" className="font-semibold text-primary-700 dark:text-teal-400 hover:underline">
            ← Back to login
          </Link>
        }
      >
        <InputField id="email" label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@company.com" required />
        {message && (
          <div className="flex items-start gap-2 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-900/20 px-4 py-3">
            <CheckCircle size={16} className="text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
            <p className="text-sm text-teal-700 dark:text-teal-300">{message}</p>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  )
}

function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(''); setLoading(true)
    try {
      await resetPassword(token, password)
      navigate('/login')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AuthCard
        title="Choose a new password"
        subtitle="Pick a strong password for your account."
        submitLabel="Set new password"
        onSubmit={submit}
        error={error}
        loading={loading}
      >
        <InputField id="new-password" label="New password" type="password" value={password} onChange={setPassword} placeholder="Min. 8 characters" required minLength={8} />
        {!token && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">Invalid or missing reset token.</p>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  )
}

function VerifyEmailPage() {
  const { verifyEmail } = useAuth()
  const navigate = useNavigate()
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing verification token.')
      return
    }
    verifyEmail(token)
      .then(() => navigate('/dashboard'))
      .catch((verificationError) => setError(verificationError instanceof Error ? verificationError.message : 'Unable to verify email'))
  }, [navigate, token, verifyEmail])

  return (
    <AuthLayout>
      <div className="card p-8 text-center shadow-xl">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Verification failed</h1>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            <Link to="/dashboard" className="btn btn-primary mt-6">Return to dashboard</Link>
          </>
        ) : (
          <p className="text-slate-600 dark:text-slate-300">Verifying your email…</p>
        )}
      </div>
    </AuthLayout>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

type SummaryData = { totalIncome: number; totalExpenses: number; net: number }
type CategoryData = { category: string; total: number }
type TrendData = { month: string; totalIncome: number; totalExpenses: number; net: number }

function MetricCard({ label, value, icon, tone }: {
  label: string; value: number; icon: React.ReactNode; tone: 'success' | 'warning' | 'primary'
}) {
  const toneClasses = {
    success: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
    warning: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    primary: 'text-primary-700 dark:text-teal-400 bg-primary-50 dark:bg-primary-900/20',
  }
  const valueClass = {
    success: 'text-teal-600 dark:text-teal-400',
    warning: 'text-amber-600 dark:text-amber-400',
    primary: value >= 0 ? 'text-primary-700 dark:text-slate-100' : 'text-red-600 dark:text-red-400',
  }

  return (
    <div className="card card-hover p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${valueClass[tone]}`}>
            ${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="mb-6 text-base font-semibold text-slate-800 dark:text-slate-200">{title}</h2>
      {children}
    </div>
  )
}

const CHART_COLORS = {
  income: '#0d9488',
  expenses: '#f59e0b',
  net: '#1e3a5f',
  bar: '#0d9488',
  grid: 'var(--tw-prose-hr, #e2e8f0)',
  axis: '#94a3b8',
  tooltip: {
    light: { bg: '#fff', border: '#e2e8f0', color: '#1e293b' },
    dark:  { bg: '#1a2535', border: '#334155', color: '#e2e8f0' },
  },
}

function Dashboard() {
  const { user, fetchAnalytics, downloadFile, resendVerification } = useAuth()
  const { theme } = useTheme()
  const [downloadError, setDownloadError] = useState('')
  const [downloading, setDownloading] = useState('')
  const [verificationMessage, setVerificationMessage] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [resendingVerification, setResendingVerification] = useState(false)

  const summary   = useQuery({ queryKey: ['analytics', 'summary'], queryFn: () => fetchAnalytics<SummaryData>('summary') })
  const categories = useQuery({ queryKey: ['analytics', 'by-category'], queryFn: () => fetchAnalytics<CategoryData[]>('by-category') })
  const trend     = useQuery({ queryKey: ['analytics', 'trend'], queryFn: () => fetchAnalytics<TrendData[]>('trend') })
  const isLoading = summary.isLoading || categories.isLoading || trend.isLoading
  const error     = summary.error ?? categories.error ?? trend.error

  const tooltipStyle = theme === 'dark' ? CHART_COLORS.tooltip.dark : CHART_COLORS.tooltip.light

  async function download(path: string) {
    setDownloadError(''); setDownloading(path)
    try { await downloadFile(path) }
    catch (e) { setDownloadError(e instanceof Error ? e.message : 'Download failed') }
    finally { setDownloading('') }
  }

  async function resend() {
    setVerificationMessage(''); setVerificationError(''); setResendingVerification(true)
    try { setVerificationMessage(await resendVerification()) }
    catch (error) { setVerificationError(error instanceof Error ? error.message : 'Unable to resend verification email') }
    finally { setResendingVerification(false) }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Welcome back, <span className="font-medium text-slate-700 dark:text-slate-300">{user?.email}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            id="download-pdf"
            onClick={() => void download('/reports/summary-pdf')}
            disabled={downloading !== ''}
            className="btn btn-outline"
          >
            <FileBarChart size={15} />
            {downloading === '/reports/summary-pdf' ? 'Generating…' : 'PDF Report'}
          </button>
          <button
            id="export-csv"
            onClick={() => void download('/transactions/export')}
            disabled={downloading !== ''}
            className="btn btn-outline"
          >
            <Download size={15} />
            {downloading === '/transactions/export' ? 'Exporting…' : 'Export CSV'}
          </button>
          <Link to="/transactions/import" id="import-transactions-btn" className="btn btn-primary">
            <Upload size={15} />
            Import
          </Link>
        </div>
      </div>

      {/* Email verification banner */}
      {!user?.emailVerifiedAt && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <MailWarning size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Please verify your email address to fully secure your account.
            <button type="button" onClick={() => void resend()} disabled={resendingVerification} className="ml-2 font-semibold underline hover:no-underline disabled:opacity-60">
              {resendingVerification ? 'Sending…' : 'Resend verification email'}
            </button>
            {verificationMessage && <span className="ml-2">{verificationMessage}</span>}
            {verificationError && <span className="ml-2 text-red-700 dark:text-red-300">{verificationError}</span>}
          </p>
        </div>
      )}

      {downloadError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{downloadError}</p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-3 py-12 justify-center text-slate-400">
          <div className="h-5 w-5 border-2 border-slate-300 border-t-primary-700 rounded-full animate-spin" />
          Loading analytics…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">
            Unable to load analytics: {error instanceof Error ? error.message : 'Request failed'}
          </p>
        </div>
      )}

      {!isLoading && !error && summary.data && (
        <>
          {/* Metric cards */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Financial summary">
            <MetricCard label="Total Income" value={summary.data.totalIncome} icon={<TrendingUp size={20} />} tone="success" />
            <MetricCard label="Total Expenses" value={summary.data.totalExpenses} icon={<TrendingDown size={20} />} tone="warning" />
            <MetricCard label="Net Balance" value={summary.data.net} icon={<DollarSign size={20} />} tone="primary" />
          </section>

          {/* Charts */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-label="Analytics charts">
            <ChartPanel title="Spend by Category">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categories.data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2d3748' : '#e2e8f0'} />
                  <XAxis dataKey="category" stroke={CHART_COLORS.axis} tick={{ fontSize: 11 }} />
                  <YAxis stroke={CHART_COLORS.axis} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipStyle.bg, borderColor: tooltipStyle.border, color: tooltipStyle.color, borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="total" fill={CHART_COLORS.bar} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="Monthly Trend">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trend.data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2d3748' : '#e2e8f0'} />
                  <XAxis dataKey="month" stroke={CHART_COLORS.axis} tick={{ fontSize: 11 }} />
                  <YAxis stroke={CHART_COLORS.axis} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipStyle.bg, borderColor: tooltipStyle.border, color: tooltipStyle.color, borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} />
                  <Line type="monotone" dataKey="totalIncome" name="Income" stroke={CHART_COLORS.income} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="totalExpenses" name="Expenses" stroke={CHART_COLORS.expenses} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
          </section>
        </>
      )}
    </div>
  )
}

function ReportsPage() {
  const { downloadFile } = useAuth()
  const [downloading, setDownloading] = useState('')
  const [error, setError] = useState('')

  async function download(path: string) {
    setError('')
    setDownloading(path)
    try {
      await downloadFile(path)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Download failed')
    } finally {
      setDownloading('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reports</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Export a summary of your FinanceFlow activity.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-danger-100 dark:border-danger-800/60 bg-danger-50 dark:bg-danger-900/20 px-4 py-3">
          <XCircle size={16} className="mt-0.5 shrink-0 text-danger-600 dark:text-danger-400" />
          <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Available reports">
        <article className="card card-hover p-5">
          <FileBarChart size={22} className="text-primary-700 dark:text-accent-400" />
          <h2 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">Summary PDF</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A printable overview of income, expenses, and balance.</p>
          <button
            type="button"
            onClick={() => void download('/reports/summary-pdf')}
            disabled={downloading !== ''}
            className="btn btn-outline mt-5"
          >
            <Download size={15} />
            {downloading === '/reports/summary-pdf' ? 'Generating…' : 'Download PDF'}
          </button>
        </article>

        <article className="card card-hover p-5">
          <Download size={22} className="text-primary-700 dark:text-accent-400" />
          <h2 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">Transaction CSV</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A spreadsheet-ready export of your transactions.</p>
          <button
            type="button"
            onClick={() => void download('/transactions/export')}
            disabled={downloading !== ''}
            className="btn btn-outline mt-5"
          >
            <Download size={15} />
            {downloading === '/transactions/export' ? 'Exporting…' : 'Export CSV'}
          </button>
        </article>
      </section>
    </div>
  )
}

// ─── Budgets page ─────────────────────────────────────────────────────────────

function BudgetRow({ budget }: { budget: Budget }) {
  const progressWidth = Math.min(budget.percentUsed, 100)
  return (
    <article
      className={`card card-hover p-5 ${budget.overBudget ? 'border-red-200 dark:border-red-800/60 bg-red-50/30 dark:bg-red-900/10' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{budget.category}</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            ${budget.actualSpend.toFixed(2)} of ${budget.monthlyLimit.toFixed(2)} used this month
          </p>
        </div>
        <span className={budget.overBudget ? 'badge badge-danger' : 'badge badge-success'}>
          {budget.percentUsed.toFixed(0)}% {budget.overBudget ? 'over budget' : 'used'}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${budget.overBudget ? 'bg-red-500' : 'bg-teal-600'}`}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
    </article>
  )
}

function BudgetsPage() {
  const { fetchBudgets, createBudget } = useAuth()
  const queryClient = useQueryClient()
  const [category, setCategory] = useState('')
  const [monthlyLimit, setMonthlyLimit] = useState('')
  const [error, setError] = useState('')
  const budgets = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgets })
  const create = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      setCategory(''); setMonthlyLimit(''); setError('')
      void queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Unable to create budget'),
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const limit = Number(monthlyLimit)
    if (!category.trim() || !Number.isFinite(limit) || limit <= 0) {
      setError('Enter a category and a positive monthly limit'); return
    }
    create.mutate({ category: category.trim(), monthly_limit: limit })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Budget Monitoring</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track current-month transaction activity against category limits.
        </p>
      </div>

      {/* Add budget form */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <Plus size={15} /> Add New Budget
        </h2>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
          <div>
            <label htmlFor="budget-category" className="label">Category</label>
            <input
              id="budget-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Software"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="budget-limit" className="label">Monthly Limit ($)</label>
            <input
              id="budget-limit"
              type="number"
              min="0.01"
              step="0.01"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="100.00"
              className="input"
            />
          </div>
          <button
            id="add-budget-btn"
            type="submit"
            disabled={create.isPending}
            className="btn btn-teal"
          >
            <Plus size={15} />
            {create.isPending ? 'Saving…' : 'Add Budget'}
          </button>
          {error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-3">{error}</p>}
        </form>
      </div>

      {/* Budget list */}
      {budgets.isLoading && (
        <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
          <div className="h-5 w-5 border-2 border-slate-300 border-t-primary-700 rounded-full animate-spin" />
          Loading budgets…
        </div>
      )}
      {budgets.error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">Unable to load budgets.</p>
        </div>
      )}

      <section className="space-y-3" aria-label="Budget list">
        {budgets.data?.map((budget) => <BudgetRow key={budget.id} budget={budget} />)}
        {budgets.data?.length === 0 && (
          <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700/50">
              <BarChart2 size={22} className="text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">No budgets yet. Add your first one above.</p>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Import page ──────────────────────────────────────────────────────────────

function ImportPage() {
  const { uploadTransactions, downloadFile } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!file) { setError('Choose a CSV file first'); return }
    setError(''); setResult(null); setUploading(true)
    try { setResult(await uploadTransactions(file)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to import CSV') }
    finally { setUploading(false) }
  }

  async function handleDownloadTemplate() {
    setDownloading(true)
    try { await downloadFile('/transactions/import-template') }
    catch { /* silently ignore — browser already gets a file or nothing */ }
    finally { setDownloading(false) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Import Transactions</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload a CSV file to bulk-import transactions into your account.
        </p>
      </div>

      {/* Format guide */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <FileText size={14} />
          Required CSV format
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { col: 'date', desc: 'ISO date, e.g. 2025-01-15' },
            { col: 'description', desc: 'Transaction label' },
            { col: 'amount', desc: 'Positive = income, negative = expense' },
            { col: 'category', desc: 'e.g. Food, Housing, Income' },
          ].map(({ col, desc }) => (
            <div key={col} className="rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-800/40 p-2.5">
              <code className="text-xs font-bold text-blue-700 dark:text-blue-400">{col}</code>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-snug">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <span className="font-semibold">Sign convention:</span> use a <span className="font-semibold">positive</span> amount for income (e.g. <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">3500</code>) and a <span className="font-semibold">negative</span> amount for expenses (e.g. <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">-87.50</code>). The first row must be the header row exactly as shown above.
        </p>
      </div>

      <div className="card p-6">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="csv-file" className="label flex items-center gap-2">
              <FileText size={14} /> Choose CSV File
            </label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <label
                htmlFor="csv-file"
                className="btn btn-outline cursor-pointer"
              >
                <Upload size={15} />
                {file ? file.name : 'Browse file…'}
              </label>
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <span className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              )}
              <button
                id="download-import-template"
                type="button"
                disabled={downloading}
                onClick={handleDownloadTemplate}
                className="btn btn-outline text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Download size={15} />
                {downloading ? 'Downloading…' : 'Download template'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Don't have a file yet? Download the template above — it includes the correct column headers and example rows you can fill in.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-4 py-3">
              <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <button
            id="upload-csv-btn"
            type="submit"
            disabled={uploading || !file}
            className="btn btn-teal"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload size={15} />
                Upload CSV
              </>
            )}
          </button>
        </form>
      </div>

      {result && (
        <div className="card p-6 space-y-5 animate-slide-up">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckCircle size={17} className="text-teal-600 dark:text-teal-400" />
            Import Complete
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/60 p-4">
              <p className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">Imported</p>
              <p className="mt-1 text-3xl font-bold text-teal-700 dark:text-teal-300">{result.imported}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/60 p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Failed</p>
              <p className="mt-1 text-3xl font-bold text-slate-700 dark:text-slate-300">{result.failed}</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Errors ({result.errors.length})</p>
              {result.errors.map((item) => (
                <div
                  key={`${item.row}-${item.issues.join('-')}`}
                  className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 p-4 text-sm"
                >
                  <p className="font-semibold text-red-700 dark:text-red-300">Row {item.row}</p>
                  <p className="mt-0.5 text-red-600 dark:text-red-400">{item.issues.join('; ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Transactions page ───────────────────────────────────────────────────────

function TransactionsPage() {
  const { fetchTransactions, fetchAnalytics } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const limit = 25

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  const query = new URLSearchParams({ page: String(page), limit: String(limit), sortBy, sortOrder })
  if (search) query.set('search', search)
  if (category) query.set('category', category)
  if (startDate) query.set('startDate', startDate)
  if (endDate) query.set('endDate', endDate)

  const transactions = useQuery({
    queryKey: ['transactions', query.toString()],
    queryFn: () => fetchTransactions(`?${query.toString()}`),
  })
  const categories = useQuery({
    queryKey: ['analytics', 'by-category'],
    queryFn: () => fetchAnalytics<CategoryData[]>('by-category'),
  })

  function toggleSort(column: 'date' | 'amount') {
    if (sortBy === column) setSortOrder((current) => current === 'asc' ? 'desc' : 'asc')
    else { setSortBy(column); setSortOrder('desc') }
    setPage(1)
  }

  function sortIcon(column: 'date' | 'amount') {
    if (sortBy !== column) return <ArrowUpDown size={13} />
    return sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
  }

  function resetFilters() {
    setSearchInput('')
    setSearch('')
    setCategory('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Transactions</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search and review activity for your organization.</p>
      </div>

      <div className="card p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[minmax(16rem,1.5fr)_minmax(10rem,1fr)_1fr_1fr_auto] lg:items-end">
          <div>
            <label htmlFor="transaction-search" className="label">Search description</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="transaction-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="e.g. groceries" className="input pl-9" />
            </div>
          </div>
          <div>
            <label htmlFor="transaction-category" className="label">Category</label>
            <select id="transaction-category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }} className="input">
              <option value="">All categories</option>
              {categories.data?.map((item) => <option key={item.category} value={item.category}>{item.category}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="transaction-start-date" className="label">From date</label>
            <input id="transaction-start-date" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1) }} className="input" />
          </div>
          <div>
            <label htmlFor="transaction-end-date" className="label">To date</label>
            <input id="transaction-end-date" type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1) }} className="input" />
          </div>
          <button type="button" onClick={resetFilters} className="btn btn-ghost justify-center">Clear</button>
        </div>
      </div>

      {transactions.isLoading && <div className="flex items-center justify-center gap-3 py-12 text-slate-400"><div className="h-5 w-5 border-2 border-slate-300 border-t-primary-700 rounded-full animate-spin" />Loading transactions…</div>}
      {transactions.error && <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-4 py-3"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" /><p className="text-sm text-red-700 dark:text-red-300">Unable to load transactions.</p></div>}

      {transactions.data && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">{transactions.data.total.toLocaleString()} transaction{transactions.data.total === 1 ? '' : 's'}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Page {transactions.data.page} of {Math.max(transactions.data.totalPages, 1)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-3"><button type="button" onClick={() => toggleSort('date')} className="inline-flex items-center gap-1.5 hover:text-primary-700 dark:hover:text-teal-400">Date {sortIcon('date')}</button></th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3"><button type="button" onClick={() => toggleSort('amount')} className="inline-flex items-center gap-1.5 hover:text-primary-700 dark:hover:text-teal-400">Amount {sortIcon('amount')}</button></th>
                  <th className="px-5 py-3">Category</th>
                </tr>
              </thead>
              <tbody>
                {transactions.data.rows.map((transaction: Transaction) => (
                  <tr key={transaction.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/20">
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{transaction.date}</td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">{transaction.description}</td>
                    <td className={`whitespace-nowrap px-5 py-4 text-sm font-semibold ${transaction.amount >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>{transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)}</td>
                    <td className="px-5 py-4"><span className="badge badge-neutral">{transaction.category}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {transactions.data.rows.length === 0 && <div className="flex flex-col items-center justify-center gap-3 py-16 text-center"><Search size={22} className="text-slate-400" /><p className="text-sm text-slate-500 dark:text-slate-400">No transactions match these filters.</p></div>}
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-700">
            <button type="button" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page === 1 || transactions.isFetching} className="btn btn-outline btn-sm"><ChevronLeft size={15} />Previous</button>
            <span className="text-xs text-slate-400 dark:text-slate-500">{transactions.data.total === 0 ? 'No results' : `${(page - 1) * limit + 1}-${Math.min(page * limit, transactions.data.total)} of ${transactions.data.total}`}</span>
            <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= transactions.data.totalPages || transactions.isFetching} className="btn btn-outline btn-sm">Next<ChevronRight size={15} /></button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Audit Logs page ──────────────────────────────────────────────────────────

function actionIcon(action: string) {
  if (action.includes('login') || action.includes('auth')) return <Shield size={13} />
  if (action.includes('import') || action.includes('transaction')) return <Upload size={13} />
  if (action.includes('budget')) return <BarChart2 size={13} />
  return <Activity size={13} />
}

function AuditRow({ log }: { log: AuditLog }) {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
      <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Clock size={13} className="shrink-0" />
        {new Date(log.createdAt).toLocaleString()}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-teal-400 text-xs font-bold">
            {log.userEmail.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm text-slate-700 dark:text-slate-300">{log.userEmail}</span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-teal-400 px-2.5 py-1 rounded-lg">
          {actionIcon(log.action)}
          {log.action}
        </span>
      </td>
      <td className="px-4 py-3.5 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
        {formatMetadata(log.metadata)}
      </td>
    </tr>
  )
}

function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) return 'No additional details'
  return Object.entries(metadata).map(([key, value]) => `${key}: ${String(value)}`).join(' | ')
}

function AuditLogsPage() {
  const { fetchAuditLogs } = useAuth()
  const auditLogs = useQuery({ queryKey: ['audit-logs'], queryFn: fetchAuditLogs })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Recent activity for your organization.
        </p>
      </div>

      {auditLogs.isLoading && (
        <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
          <div className="h-5 w-5 border-2 border-slate-300 border-t-primary-700 rounded-full animate-spin" />
          Loading audit logs…
        </div>
      )}
      {auditLogs.error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">Unable to load audit logs.</p>
        </div>
      )}

      {auditLogs.data && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.data.map((log) => <AuditRow key={log.id} log={log} />)}
              </tbody>
            </table>
          </div>
          {auditLogs.data.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700/50">
                <ClipboardList size={22} className="text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">No audit activity yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}



// ─── Protected wrapper (adds AppLayout) ──────────────────────────────────────

function ProtectedWithLayout() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/import" element={<ImportPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </ProtectedRoute>
  )
}

// ─── App root ─────────────────────────────────────────────────────────────────

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/*" element={<ProtectedWithLayout />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
