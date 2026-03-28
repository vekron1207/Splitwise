'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { groupsApi, usersApi } from '@/lib/api'
import Navbar from '@/components/Navbar'
import CreateGroupModal from '@/components/modals/CreateGroupModal'
import { Plus, Users, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, user, init } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { init() }, [init])
  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
  }, [isAuthenticated, router])

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list().then(r => r.data),
    enabled: isAuthenticated,
  })

  const { data: summary } = useQuery({
    queryKey: ['balance-summary'],
    queryFn: () => usersApi.balanceSummary().then(r => r.data),
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) return null

  const netBalance = summary?.netBalance ?? 0
  const isPositive = netBalance > 0
  const isNeutral = netBalance === 0

  return (
    <div className="min-h-screen" style={{ background: '#07070f' }}>
      <div className="orb w-[500px] h-[500px] -top-32 -right-32 opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(110,231,183,0.07) 0%, transparent 70%)' }} />
      <div className="orb w-96 h-96 bottom-0 -left-32 opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />

      <Navbar />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 sm:mb-8 animate-fade-up">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
              Hey, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#8b90a0' }}>
              {groups?.length ?? 0} group{groups?.length !== 1 ? 's' : ''} · manage shared expenses
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-accent flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-sm flex-shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New group</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Balance Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10 animate-fade-up delay-1">
          {/* Total owed to me */}
          <div className="glass rounded-2xl p-4 sm:p-5 flex sm:block items-center gap-4">
            <div className="flex items-center gap-2 mb-0 sm:mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(110,231,183,0.15)' }}>
                <TrendingUp size={14} style={{ color: '#6ee7b7' }} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest sm:hidden" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                Owed to you
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest hidden sm:inline" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                You are owed
              </span>
            </div>
            <div className="flex-1 sm:block flex items-baseline gap-2">
              <p className="text-xl sm:text-2xl font-bold font-mono text-positive" style={{ fontFamily: "'Syne', sans-serif" }}>
                ₹{(summary?.totalOwed ?? 0).toFixed(2)}
              </p>
              <p className="text-xs" style={{ color: '#8b90a0' }}>across all groups</p>
            </div>
          </div>

          {/* Net balance */}
          <div className="glass rounded-2xl p-4 sm:p-5 flex sm:block items-center gap-4" style={{
            background: isNeutral
              ? 'rgba(18,18,36,0.75)'
              : isPositive
              ? 'rgba(110,231,183,0.07)'
              : 'rgba(248,113,113,0.07)',
            border: `1px solid ${isNeutral ? 'rgba(255,255,255,0.14)' : isPositive ? 'rgba(110,231,183,0.25)' : 'rgba(248,113,113,0.25)'}`,
          }}>
            <div className="flex items-center gap-2 mb-0 sm:mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: isNeutral ? 'rgba(255,255,255,0.06)' : isPositive ? 'rgba(110,231,183,0.15)' : 'rgba(248,113,113,0.15)' }}>
                <Minus size={14} style={{ color: isNeutral ? '#8b90a0' : isPositive ? '#6ee7b7' : '#f87171' }} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                Net balance
              </span>
            </div>
            <div className="flex-1 sm:block flex items-baseline gap-2">
              <p className="text-xl sm:text-2xl font-bold" style={{
                fontFamily: "'Syne', sans-serif",
                color: isNeutral ? '#8b90a0' : isPositive ? '#6ee7b7' : '#f87171',
              }}>
                {isPositive ? '+' : ''}{(summary?.netBalance ?? 0).toFixed(2)}
              </p>
              <p className="text-xs" style={{ color: '#8b90a0' }}>
                {isNeutral ? 'All settled up' : isPositive ? "you're owed" : 'you owe'}
              </p>
            </div>
          </div>

          {/* Total I owe */}
          <div className="glass rounded-2xl p-4 sm:p-5 flex sm:block items-center gap-4">
            <div className="flex items-center gap-2 mb-0 sm:mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(248,113,113,0.12)' }}>
                <TrendingDown size={14} style={{ color: '#f87171' }} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                You owe
              </span>
            </div>
            <div className="flex-1 sm:block flex items-baseline gap-2">
              <p className="text-xl sm:text-2xl font-bold font-mono text-negative" style={{ fontFamily: "'Syne', sans-serif" }}>
                ₹{(summary?.totalOwe ?? 0).toFixed(2)}
              </p>
              <p className="text-xs" style={{ color: '#8b90a0' }}>across all groups</p>
            </div>
          </div>
        </div>

        {/* Groups */}
        <div className="flex items-center justify-between mb-4 animate-fade-up delay-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
            Your groups
          </h2>
        </div>

        {groupsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-36" style={{ animationDelay: `${i * 0.05}s` }} />
            ))}
          </div>
        ) : groups && groups.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map((g, i) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="glass glass-hover rounded-2xl p-6 flex flex-col gap-4 animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold"
                      style={{
                        background: 'linear-gradient(135deg, rgba(110,231,183,0.15), rgba(52,211,153,0.08))',
                        border: '1px solid rgba(110,231,183,0.2)',
                        fontFamily: "'Syne', sans-serif",
                        color: '#6ee7b7',
                      }}>
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-base leading-tight" style={{ fontFamily: "'Syne', sans-serif", color: '#e8eaf0' }}>
                        {g.name}
                      </h3>
                      {g.description && (
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#8b90a0' }}>{g.description}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: '#3a3f52' }} />
                </div>

                <div className="flex items-center gap-4 text-xs" style={{ color: '#8b90a0' }}>
                  <span className="flex items-center gap-1.5">
                    <Users size={12} />
                    {g.members?.length ?? 0} member{(g.members?.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <span>·</span>
                  <span>{new Date(g.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-16 text-center animate-fade-up">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.15)' }}>
              <Users size={28} style={{ color: '#6ee7b7', opacity: 0.7 }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>No groups yet</h2>
            <p className="text-sm mb-6" style={{ color: '#8b90a0' }}>Create a group to start splitting expenses with friends.</p>
            <button onClick={() => setShowCreate(true)} className="btn-accent px-6 py-3 rounded-xl text-sm">
              Create your first group
            </button>
          </div>
        )}
      </main>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
