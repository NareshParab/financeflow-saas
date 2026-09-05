import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext.tsx'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <main className="min-h-screen bg-slate-950 p-8 text-slate-100">Loading...</main>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}