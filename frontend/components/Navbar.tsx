'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import ThemeToggle from '@/components/ThemeToggle'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  function handleLogout() {
    logout()
    toast.success('Signed out')
    router.push('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <nav className="sticky top-0 z-50 glass border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(110,231,183,0.25), rgba(52,211,153,0.1))', border: '1px solid rgba(110,231,183,0.3)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#6ee7b7" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#6ee7b7" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight" style={{ fontFamily: "'Syne', sans-serif", color: '#e8eaf0' }}>
            Split<span style={{ color: '#6ee7b7' }}>wise</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user && (
            <span className="text-sm hidden md:block" style={{ color: '#8b90a0' }}>
              {user.email}
            </span>
          )}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6ee7b7, #34d399)', color: '#07070f', fontFamily: "'Syne', sans-serif" }}>
            {initials}
          </div>
          <button
            onClick={handleLogout}
            className="btn-ghost rounded-lg px-2.5 py-1.5 text-xs"
          >
            <span className="hidden sm:inline">Sign out</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
