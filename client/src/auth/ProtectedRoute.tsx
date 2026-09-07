import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext.tsx'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f1a27] transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-3 border-slate-200 border-t-primary-700 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading FinanceFlow…</p>
        </div>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />
}