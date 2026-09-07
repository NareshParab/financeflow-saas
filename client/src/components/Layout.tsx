import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  Upload,
  ClipboardList,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  TrendingUp,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.tsx'
import { useTheme } from '../auth/ThemeContext.tsx'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { to: '/budgets', label: 'Budgets', icon: <Wallet size={17} /> },
  { to: '/transactions/import', label: 'Import', icon: <Upload size={17} /> },
  { to: '/audit-logs', label: 'Audit Logs', icon: <ClipboardList size={17} /> },
]

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      id="theme-toggle"
      aria-label="Toggle theme"
      className="btn btn-ghost btn-icon rounded-xl"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

function UserMenu({ email, role }: { email: string; role: string }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="relative">
      <button
        id="user-menu-button"
        onClick={() => setOpen((p) => !p)}
        className="btn btn-ghost rounded-xl flex items-center gap-2 pr-3"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-700 text-white text-xs font-bold">
          {email.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:block max-w-[120px] truncate text-sm font-medium">{email}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-56 card p-1.5 shadow-lg animate-fade-in">
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 mb-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Signed in as</p>
              <p className="text-sm font-semibold truncate">{email}</p>
              <span className="badge badge-neutral mt-1">{role}</span>
            </div>
            <button
              id="logout-button"
              onClick={() => void handleLogout()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1a27] flex flex-col transition-colors duration-300">
      {/* Top Nav */}
      <header className="sticky top-0 z-30 glass border-b border-slate-200 dark:border-slate-700/60 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/dashboard" id="logo-link" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700 shadow-sm group-hover:bg-primary-800 transition-colors">
                <TrendingUp size={16} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-primary-700 dark:text-teal-400">
                FinanceFlow
              </span>
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {navItems.map((item) => {
                const active = location.pathname === item.to
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`nav-link ${active ? 'nav-link-active' : ''}`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user && <UserMenu email={user.email} role={user.role} />}

              {/* Mobile hamburger */}
              <button
                id="mobile-menu-toggle"
                className="md:hidden btn btn-ghost btn-icon rounded-xl"
                onClick={() => setMobileMenuOpen((p) => !p)}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700/60 animate-slide-up">
            <nav className="px-4 py-3 flex flex-col gap-1" aria-label="Mobile navigation">
              {navItems.map((item) => {
                const active = location.pathname === item.to
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    id={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`nav-link py-3 ${active ? 'nav-link-active' : ''}`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="page-enter">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass border-t border-slate-200 dark:border-slate-700/60"
        aria-label="Bottom navigation"
      >
        <div className="flex">
          {navItems.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                id={`tab-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150
                  ${active
                    ? 'text-primary-700 dark:text-teal-400'
                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom padding for mobile tab bar */}
      <div className="md:hidden h-16" />
    </div>
  )
}

/** Minimal layout for auth pages (no nav) */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0f1a27] transition-colors duration-300">
      {/* Minimal header with logo + theme toggle */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/login" className="flex items-center gap-2 group" id="auth-logo">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700 shadow-sm">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-primary-700 dark:text-teal-400">FinanceFlow</span>
        </Link>
        <button
          onClick={toggleTheme}
          id="auth-theme-toggle"
          aria-label="Toggle theme"
          className="btn btn-ghost btn-icon rounded-xl"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Auth content centered */}
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md page-enter">
          {children}
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} FinanceFlow. All rights reserved.
      </footer>
    </div>
  )
}
