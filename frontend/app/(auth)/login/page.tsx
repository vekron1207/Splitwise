'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, init } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard')
  }, [isAuthenticated, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login({ email, password })
      const { token, userId, name, email: userEmail } = res.data
      login(token, { userId, name, email: userEmail })
      toast.success(`Welcome back, ${name}`)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Ambient orbs */}
      <div className="orb w-96 h-96 top-0 right-0 opacity-60" style={{ background: 'radial-gradient(circle, rgba(110,231,183,0.08) 0%, transparent 70%)' }} />
      <div className="orb w-80 h-80 bottom-0 left-0 opacity-50" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 animate-pulse-glow"
            style={{ background: 'linear-gradient(135deg, rgba(110,231,183,0.2), rgba(52,211,153,0.1))', border: '1px solid rgba(110,231,183,0.3)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#6ee7b7" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#6ee7b7" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Syne', sans-serif", color: '#e8eaf0' }}>
            Split<span style={{ color: '#6ee7b7' }}>wise</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#8b90a0' }}>Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-up delay-1">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input-glass w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input-glass w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full rounded-xl py-3 text-sm mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: '#8b90a0' }}>
            No account?{' '}
            <Link href="/signup" className="font-medium transition-colors" style={{ color: '#6ee7b7' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
