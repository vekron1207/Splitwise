'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth'
import { groupsApi, expensesApi, balancesApi, settlementsApi } from '@/lib/api'
import Navbar from '@/components/Navbar'
import AddExpenseModal from '@/components/modals/AddExpenseModal'
import SettleUpModal from '@/components/modals/SettleUpModal'
import AddMemberModal from '@/components/modals/AddMemberModal'
import ExpenseCard from '@/components/ExpenseCard'
import GroupSettingsModal, { SIMPLIFIED_KEY } from '@/components/modals/GroupSettingsModal'
import { ArrowLeft, Plus, UserPlus, Wallet, Receipt, Users, TrendingUp, Settings } from 'lucide-react'
import { ExpenseResponse, SettlementResponse, SimplifiedDebtResponse } from '@/lib/types'

type Tab = 'expenses' | 'balances' | 'members' | 'settlements'

export default function GroupPage() {
  const params = useParams()
  const groupId = Number(params.groupId)
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated, user, init } = useAuthStore()
  const [tab, setTab] = useState<Tab>('expenses')
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showSettleUp, setShowSettleUp] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null)

  // Read simplified preference from localStorage (written by GroupSettingsModal)
  const [useSimplified, setUseSimplified] = useState(true)
  useEffect(() => {
    if (!groupId) return
    const stored = localStorage.getItem(SIMPLIFIED_KEY(groupId))
    setUseSimplified(stored === null ? true : stored === 'true')
  }, [groupId, showSettings])

  useEffect(() => { init() }, [init])
  useEffect(() => { if (!isAuthenticated) router.replace('/login') }, [isAuthenticated, router])

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.get(groupId).then(r => r.data),
    enabled: isAuthenticated && !!groupId,
  })

  const { data: expensePage, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => expensesApi.list(groupId).then(r => r.data),
    enabled: isAuthenticated && !!groupId,
  })

  const { data: simplified } = useQuery({
    queryKey: ['balances', groupId, 'simplified'],
    queryFn: () => balancesApi.simplified(groupId).then(r => r.data),
    enabled: isAuthenticated && !!groupId && tab === 'balances',
  })

  const { data: allBalances } = useQuery({
    queryKey: ['balances', groupId, 'all'],
    queryFn: () => balancesApi.all(groupId).then(r => r.data),
    enabled: isAuthenticated && !!groupId && tab === 'balances',
  })

  const { data: settlements, isLoading: settlementsLoading } = useQuery({
    queryKey: ['settlements', groupId],
    queryFn: () => settlementsApi.list(groupId).then(r => r.data),
    enabled: isAuthenticated && !!groupId && tab === 'settlements',
  })

  const expenses: ExpenseResponse[] = expensePage?.content ?? []
  const isAdmin = group?.createdBy?.id === user?.userId

  if (!isAuthenticated) return null

  // Group expenses by date
  const groupedExpenses: Record<string, ExpenseResponse[]> = {}
  expenses.forEach(exp => {
    const date = new Date(exp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!groupedExpenses[date]) groupedExpenses[date] = []
    groupedExpenses[date].push(exp)
  })

  return (
    <div className="min-h-screen pb-24 sm:pb-8" style={{ background: '#07070f' }}>
      <div className="orb w-[400px] h-[400px] -top-24 -right-24 opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(110,231,183,0.07) 0%, transparent 70%)' }} />

      <Navbar />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* Back + header */}
        <div className="mb-5 sm:mb-8 animate-fade-up">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm mb-4 transition-colors"
            style={{ color: '#8b90a0' }}>
            <ArrowLeft size={14} />
            Back
          </Link>

          {groupLoading ? (
            <div className="skeleton h-10 w-48" />
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {group?.name}
                </h1>
                {group?.description && (
                  <p className="text-sm mt-0.5 truncate" style={{ color: '#8b90a0' }}>{group.description}</p>
                )}
              </div>
              {/* Desktop action buttons */}
              <div className="hidden sm:flex flex-wrap gap-2 flex-shrink-0">
                <button onClick={() => setShowAddMember(true)} className="btn-ghost flex items-center gap-2 px-4 py-2 rounded-xl text-xs">
                  <UserPlus size={14} /> Add member
                </button>
                <button onClick={() => setShowSettleUp(true)} className="btn-ghost flex items-center gap-2 px-4 py-2 rounded-xl text-xs">
                  <Wallet size={14} /> Settle up
                </button>
                <button onClick={() => setShowAddExpense(true)} className="btn-accent flex items-center gap-2 px-4 py-2 rounded-xl text-xs">
                  <Plus size={14} /> Add expense
                </button>
                <button onClick={() => setShowSettings(true)} className="btn-ghost flex items-center gap-2 px-3 py-2 rounded-xl text-xs">
                  <Settings size={14} />
                </button>
              </div>
              {/* Mobile settings icon */}
              <button onClick={() => setShowSettings(true)} className="sm:hidden btn-ghost p-2 rounded-xl flex-shrink-0">
                <Settings size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mb-6 sm:mb-8 animate-fade-up delay-1">
          <div className="flex gap-6 sm:gap-8 border-b min-w-max sm:min-w-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {([
              { id: 'expenses', label: 'Expenses', icon: Receipt },
              { id: 'balances', label: 'Balances', icon: TrendingUp },
              { id: 'settlements', label: 'Settlements', icon: Wallet },
              { id: 'members', label: 'Members', icon: Users },
            ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`tab-btn flex items-center gap-1.5 text-sm whitespace-nowrap ${tab === id ? 'tab-active' : ''}`}>
                <Icon size={13} />
                {label}
                {id === 'expenses' && expenses.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(110,231,183,0.15)', color: '#6ee7b7' }}>
                    {expenses.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Expenses Tab ─── */}
        {tab === 'expenses' && (
          <div className="animate-fade-up">
            {expensesLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20" />)}</div>
            ) : expenses.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="text-4xl mb-3">🧾</div>
                <p className="font-semibold mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>No expenses yet</p>
                <p className="text-sm mb-5" style={{ color: '#8b90a0' }}>Add the first expense to get started.</p>
                <button onClick={() => setShowAddExpense(true)} className="btn-accent px-5 py-2.5 rounded-xl text-sm">
                  Add expense
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedExpenses).map(([date, exps]) => (
                  <div key={date}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>{date}</p>
                    <div className="space-y-2">
                      {exps.map((exp, i) => (
                        <ExpenseCard
                          key={exp.id}
                          expense={exp}
                          groupId={groupId}
                          currentUserId={user?.userId ?? 0}
                          isAdmin={isAdmin}
                          style={{ animationDelay: `${i * 0.04}s` }}
                          onEdit={() => setEditingExpense(exp)}
                          onDeleted={() => {
                            qc.invalidateQueries({ queryKey: ['expenses', groupId] })
                            qc.invalidateQueries({ queryKey: ['balances', groupId] })
                            qc.invalidateQueries({ queryKey: ['balance-summary'] })
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Balances Tab ─── */}
        {tab === 'balances' && (
          <div className="space-y-5 animate-fade-up">
            {/* Simplified / All toggle */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl p-1 gap-0.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  onClick={() => { setUseSimplified(true); localStorage.setItem(SIMPLIFIED_KEY(groupId), 'true') }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: useSimplified ? 'rgba(110,231,183,0.15)' : 'transparent',
                    color: useSimplified ? '#6ee7b7' : '#8b90a0',
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  Simplified
                </button>
                <button
                  onClick={() => { setUseSimplified(false); localStorage.setItem(SIMPLIFIED_KEY(groupId), 'false') }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: !useSimplified ? 'rgba(110,231,183,0.15)' : 'transparent',
                    color: !useSimplified ? '#6ee7b7' : '#8b90a0',
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  All balances
                </button>
              </div>
            </div>

            {useSimplified ? (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>Simplified debts</h2>
                {!simplified || simplified.length === 0 ? (
                  <div className="glass rounded-2xl p-8 text-center">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="font-semibold text-sm" style={{ fontFamily: "'Syne', sans-serif", color: '#6ee7b7' }}>All settled up!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(simplified as SimplifiedDebtResponse[]).map((d, i) => (
                      <div key={i} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-sm min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', fontFamily: "'Syne', sans-serif" }}>
                            {d.fromUserName.charAt(0)}
                          </div>
                          <span className="truncate">
                            <span style={{ color: '#e8eaf0', fontWeight: 600 }}>{d.fromUserName}</span>
                            <span style={{ color: '#8b90a0' }}> owes </span>
                            <span style={{ color: '#e8eaf0', fontWeight: 600 }}>{d.toUserName}</span>
                          </span>
                        </div>
                        <span className="font-mono text-sm font-semibold text-negative flex-shrink-0">₹{Number(d.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>All balances</h2>
                {!allBalances || allBalances.length === 0 ? (
                  <div className="glass rounded-2xl p-8 text-center">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="font-semibold text-sm" style={{ fontFamily: "'Syne', sans-serif", color: '#6ee7b7' }}>All settled up!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allBalances.map((b, i) => {
                      const isOwed = b.toUserId === user?.userId
                      const isYourDebt = b.fromUserId === user?.userId
                      return (
                        <div key={i} className="glass rounded-xl px-4 py-3 flex justify-between items-center gap-3 text-sm">
                          <span style={{ color: '#8b90a0' }} className="truncate">
                            {isOwed
                              ? <><span style={{ color: '#c8cad4' }}>{b.fromUserName}</span> <span className="text-positive font-semibold">owes you</span></>
                              : isYourDebt
                              ? <>You <span className="text-negative font-semibold">owe</span> <span style={{ color: '#c8cad4' }}>{b.toUserName}</span></>
                              : <><span style={{ color: '#c8cad4' }}>{b.fromUserName}</span> <span style={{ color: '#8b90a0' }}>owes</span> <span style={{ color: '#c8cad4' }}>{b.toUserName}</span></>
                            }
                          </span>
                          <span className={`font-mono font-semibold flex-shrink-0 ${isOwed ? 'text-positive' : 'text-negative'}`}>
                            ₹{Number(b.amount).toFixed(2)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Settlements Tab ─── */}
        {tab === 'settlements' && (
          <div className="space-y-3 animate-fade-up">
            {settlementsLoading ? (
              [1, 2].map(i => <div key={i} className="skeleton h-16" />)
            ) : !settlements || settlements.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="text-4xl mb-3">💸</div>
                <p className="font-semibold mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>No settlements yet</p>
                <p className="text-sm" style={{ color: '#8b90a0' }}>Use &quot;Settle up&quot; to record payments.</p>
              </div>
            ) : (
              (settlements as SettlementResponse[]).map((s, i) => (
                <div key={s.id} className="glass rounded-xl px-5 py-4 flex items-center justify-between animate-fade-up"
                  style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                      style={{ background: 'rgba(110,231,183,0.12)', color: '#6ee7b7' }}>💸</div>
                    <div className="text-sm">
                      <p>
                        <span style={{ fontWeight: 600, color: '#e8eaf0' }}>{s.paidBy.name}</span>
                        <span style={{ color: '#8b90a0' }}> paid </span>
                        <span style={{ fontWeight: 600, color: '#e8eaf0' }}>{s.paidTo.name}</span>
                      </p>
                      {s.note && <p className="text-xs" style={{ color: '#8b90a0' }}>{s.note}</p>}
                      <p className="text-xs" style={{ color: '#3a3f52' }}>
                        {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-semibold text-positive">₹{Number(s.amount).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Members Tab ─── */}
        {tab === 'members' && (
          <div className="space-y-3 animate-fade-up">
            {groupLoading ? (
              [1, 2].map(i => <div key={i} className="skeleton h-16" />)
            ) : (
              group?.members?.map((m, i) => (
                <div key={m.id} className="glass rounded-xl px-5 py-4 flex items-center gap-4 animate-fade-up"
                  style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, rgba(110,231,183,0.2), rgba(52,211,153,0.1))', color: '#6ee7b7', fontFamily: "'Syne', sans-serif" }}>
                    {m.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ fontFamily: "'Syne', sans-serif", color: '#e8eaf0' }}>
                      {m.user.name}
                      {m.user.id === user?.userId && <span className="ml-1 text-xs font-normal" style={{ color: '#8b90a0' }}>(you)</span>}
                    </p>
                    <p className="text-xs" style={{ color: '#8b90a0' }}>{m.user.email}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full"
                    style={{
                      background: m.role === 'ADMIN' ? 'rgba(110,231,183,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${m.role === 'ADMIN' ? 'rgba(110,231,183,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      color: m.role === 'ADMIN' ? '#6ee7b7' : '#8b90a0',
                      fontFamily: "'Syne', sans-serif", fontWeight: 600,
                    }}>
                    {m.role}
                  </span>
                </div>
              ))
            )}
            <button onClick={() => setShowAddMember(true)}
              className="btn-ghost w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm mt-2">
              <UserPlus size={14} /> Add member
            </button>
          </div>
        )}
      </main>

      {(showAddExpense || editingExpense) && group && (
        <AddExpenseModal
          groupId={groupId}
          members={group.members ?? []}
          editExpense={editingExpense ?? undefined}
          onClose={() => { setShowAddExpense(false); setEditingExpense(null) }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['expenses', groupId] })
            qc.invalidateQueries({ queryKey: ['balances', groupId] })
            qc.invalidateQueries({ queryKey: ['balance-summary'] })
          }}
        />
      )}
      {showSettleUp && (
        <SettleUpModal groupId={groupId} debts={simplified ?? []} onClose={() => setShowSettleUp(false)} />
      )}
      {showAddMember && (
        <AddMemberModal
          groupId={groupId}
          existingMemberIds={group?.members?.map(m => m.user.id) ?? []}
          onClose={() => setShowAddMember(false)}
        />
      )}
      {showSettings && group && (
        <GroupSettingsModal group={group} onClose={() => setShowSettings(false)} />
      )}

      {/* Mobile floating action bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-3"
        style={{ background: 'linear-gradient(to top, rgba(7,7,15,0.98) 60%, transparent)' }}>
        <div className="flex gap-2">
          <button onClick={() => setShowAddMember(true)}
            className="btn-ghost flex items-center justify-center gap-1.5 flex-1 py-3 rounded-2xl text-xs">
            <UserPlus size={14} /> Member
          </button>
          <button onClick={() => setShowSettleUp(true)}
            className="btn-ghost flex items-center justify-center gap-1.5 flex-1 py-3 rounded-2xl text-xs">
            <Wallet size={14} /> Settle
          </button>
          <button onClick={() => setShowAddExpense(true)}
            className="btn-accent flex items-center justify-center gap-1.5 flex-[2] py-3 rounded-2xl text-sm font-semibold">
            <Plus size={16} /> Add expense
          </button>
        </div>
      </div>
    </div>
  )
}
