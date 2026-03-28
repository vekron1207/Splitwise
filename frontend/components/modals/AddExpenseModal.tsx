'use client'
import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { expensesApi } from '@/lib/api'
import { MemberResponse, SplitType, ExpenseCategory, ExpenseResponse } from '@/lib/types' // ExpenseCategory kept for payload typing
import { useAuthStore } from '@/store/auth'
import { X, Check, ChevronDown } from 'lucide-react'

interface Props {
  groupId: number
  members: MemberResponse[]
  editExpense?: ExpenseResponse
  onClose: () => void
  onSaved: () => void
}

export default function AddExpenseModal({ groupId, members, editExpense, onClose, onSaved }: Props) {
  const { user } = useAuthStore()
  const isEdit = !!editExpense

  const [title, setTitle] = useState(editExpense?.title ?? '')
  const [description, setDescription] = useState(editExpense?.description ?? '')
  const [amount, setAmount] = useState(editExpense ? String(editExpense.amount) : '')
  const [splitType, setSplitType] = useState<SplitType>(editExpense?.splitType ?? 'EQUAL')
  const [paidBy, setPaidBy] = useState<number>(editExpense?.paidBy?.id ?? user?.userId ?? 0)
  const [loading, setLoading] = useState(false)
  const [paidByOpen, setPaidByOpen] = useState(false)
  const paidByRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (paidByRef.current && !paidByRef.current.contains(e.target as Node)) {
        setPaidByOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Which members are included in this expense
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    if (editExpense?.splits?.length) {
      return new Set(editExpense.splits.map(s => s.userId))
    }
    return new Set(members.map(m => m.user.id))
  })

  const [exactAmounts, setExactAmounts] = useState<Record<number, string>>({})
  const [percentages, setPercentages] = useState<Record<number, string>>({})

  // Active (selected) members
  const activeMembers = members.filter(m => selectedIds.has(m.user.id))

  // Pre-fill splits when editing
  useEffect(() => {
    if (editExpense && editExpense.splits.length > 0) {
      if (editExpense.splitType === 'EXACT') {
        const ea: Record<number, string> = {}
        editExpense.splits.forEach(s => { ea[s.userId] = String(s.amount) })
        setExactAmounts(ea)
      } else if (editExpense.splitType === 'PERCENTAGE') {
        const pct: Record<number, string> = {}
        editExpense.splits.forEach(s => { pct[s.userId] = String(s.percentage ?? '') })
        setPercentages(pct)
      }
    }
  }, [editExpense])

  // Reset split values when split type changes
  useEffect(() => {
    const init: Record<number, string> = {}
    members.forEach(m => { init[m.user.id] = '' })
    if (splitType === 'EXACT') setExactAmounts(init)
    if (splitType === 'PERCENTAGE') setPercentages(init)
  }, [splitType, members])

  function toggleMember(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return prev // keep at least one
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const totalExact = activeMembers.reduce((s, m) => s + (parseFloat(exactAmounts[m.user.id] || '0') || 0), 0)
  const totalPct = activeMembers.reduce((s, m) => s + (parseFloat(percentages[m.user.id] || '0') || 0), 0)
  const numAmount = parseFloat(amount) || 0
  const equalShare = activeMembers.length > 0 ? (numAmount / activeMembers.length).toFixed(2) : '0'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || numAmount <= 0) { toast.error('Title and amount are required'); return }
    if (activeMembers.length === 0) { toast.error('Select at least one member'); return }
    if (splitType === 'EXACT' && Math.abs(totalExact - numAmount) > 0.01) {
      toast.error(`Split amounts must sum to ₹${numAmount.toFixed(2)}`); return
    }
    if (splitType === 'PERCENTAGE' && Math.abs(totalPct - 100) > 0.01) {
      toast.error('Percentages must sum to 100'); return
    }

    const splits = activeMembers.map(m => {
      if (splitType === 'EXACT') return { userId: m.user.id, amount: parseFloat(exactAmounts[m.user.id] || '0') }
      if (splitType === 'PERCENTAGE') return { userId: m.user.id, percentage: parseFloat(percentages[m.user.id] || '0') }
      return { userId: m.user.id }
    })

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      amount: numAmount,
      splitType,
      category: 'OTHER' as ExpenseCategory,
      paidBy: paidBy || undefined,
      splits,
    }

    setLoading(true)
    try {
      if (isEdit && editExpense) {
        await expensesApi.update(groupId, editExpense.id, payload)
        toast.success('Expense updated!')
      } else {
        await expensesApi.create(groupId, payload)
        toast.success('Expense added!')
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || `Failed to ${isEdit ? 'update' : 'add'} expense`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="glass rounded-2xl modal-sheet w-full max-w-lg max-h-[92vh] overflow-y-auto animate-fade-up"
        onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
              {isEdit ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <button onClick={onClose} className="btn-ghost rounded-lg p-1.5"><X size={16} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required
                placeholder="Dinner at Barbeque Nation"
                className="input-glass w-full rounded-xl px-4 py-3 text-sm" />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>Amount (₹) *</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                required min="0.01" step="0.01" placeholder="0.00"
                className="input-glass w-full rounded-xl px-4 py-3 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }} />
            </div>

            {/* Paid by */}
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>Paid by</label>
              <div ref={paidByRef} className="relative">
                {/* Trigger */}
                <button
                  type="button"
                  onClick={() => setPaidByOpen(o => !o)}
                  className="input-glass w-full rounded-xl px-4 py-3 text-sm flex items-center gap-3 text-left"
                >
                  {(() => {
                    const m = members.find(m => m.user.id === paidBy)
                    return m ? (
                      <>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(110,231,183,0.2)', color: '#6ee7b7', fontFamily: "'Syne', sans-serif" }}>
                          {m.user.name.charAt(0)}
                        </div>
                        <span className="flex-1" style={{ color: '#e8eaf0' }}>{m.user.name}</span>
                      </>
                    ) : <span className="flex-1" style={{ color: '#8b90a0' }}>Select…</span>
                  })()}
                  <ChevronDown size={14} style={{ color: '#8b90a0', transform: paidByOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </button>

                {/* Dropdown */}
                {paidByOpen && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden"
                    style={{ background: 'rgba(13,13,26,0.98)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)' }}>
                    {members.map(m => {
                      const isSelected = m.user.id === paidBy
                      return (
                        <button
                          key={m.user.id}
                          type="button"
                          onClick={() => { setPaidBy(m.user.id); setPaidByOpen(false) }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                          style={{ background: isSelected ? 'rgba(110,231,183,0.1)' : 'transparent' }}
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: isSelected ? 'rgba(110,231,183,0.2)' : 'rgba(255,255,255,0.08)', color: isSelected ? '#6ee7b7' : '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                            {m.user.name.charAt(0)}
                          </div>
                          <span className="flex-1 text-sm" style={{ color: isSelected ? '#6ee7b7' : '#e8eaf0', fontFamily: "'Syne', sans-serif" }}>
                            {m.user.name}
                          </span>
                          {isSelected && <Check size={13} style={{ color: '#6ee7b7', flexShrink: 0 }} />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Split between — member checkboxes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                  Split between
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelectedIds(new Set(members.map(m => m.user.id)))}
                    className="text-xs" style={{ color: '#6ee7b7' }}>All</button>
                  <span style={{ color: '#3a3f52' }}>·</span>
                  <button type="button"
                    onClick={() => setSelectedIds(new Set([user?.userId ?? members[0]?.user.id]))}
                    className="text-xs" style={{ color: '#8b90a0' }}>Just me</button>
                </div>
              </div>
              <div className="space-y-1.5">
                {members.map(m => {
                  const checked = selectedIds.has(m.user.id)
                  const isMe = m.user.id === user?.userId
                  return (
                    <button
                      key={m.user.id}
                      type="button"
                      onClick={() => toggleMember(m.user.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                      style={{
                        background: checked ? 'rgba(110,231,183,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${checked ? 'rgba(110,231,183,0.25)' : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: checked ? 'rgba(110,231,183,0.8)' : 'rgba(255,255,255,0.08)',
                          border: `1px solid ${checked ? 'transparent' : 'rgba(255,255,255,0.15)'}`,
                        }}>
                        {checked && <Check size={11} style={{ color: '#07070f' }} />}
                      </div>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: checked ? 'rgba(110,231,183,0.2)' : 'rgba(255,255,255,0.06)', color: checked ? '#6ee7b7' : '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                        {m.user.name.charAt(0)}
                      </div>
                      <span className="text-sm flex-1" style={{ color: checked ? '#e8eaf0' : '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                        {m.user.name}{isMe && <span className="ml-1 text-xs" style={{ color: '#8b90a0' }}>(you)</span>}
                      </span>
                      {checked && splitType === 'EQUAL' && numAmount > 0 && (
                        <span className="text-xs font-mono" style={{ color: '#6ee7b7' }}>₹{equalShare}</span>
                      )}
                    </button>
                  )
                })}
              </div>
              {activeMembers.length < members.length && (
                <p className="text-xs mt-1.5" style={{ color: '#8b90a0' }}>
                  {activeMembers.length} of {members.length} members included
                </p>
              )}
            </div>

            {/* Split type */}
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>Split type</label>
              <div className="flex gap-2">
                {(['EQUAL', 'EXACT', 'PERCENTAGE'] as SplitType[]).map(t => (
                  <button key={t} type="button" onClick={() => setSplitType(t)}
                    className="flex-1 py-2 rounded-xl text-xs transition-all"
                    style={{
                      background: splitType === t ? 'rgba(110,231,183,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${splitType === t ? 'rgba(110,231,183,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: splitType === t ? '#6ee7b7' : '#8b90a0',
                      fontFamily: "'Syne', sans-serif", fontWeight: 600,
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Exact amounts (only active members) */}
            {splitType === 'EXACT' && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs" style={{ color: '#8b90a0' }}>
                  <span>Custom amounts</span>
                  <span className={Math.abs(totalExact - numAmount) < 0.01 && numAmount > 0 ? 'text-positive' : 'text-negative'}>
                    ₹{totalExact.toFixed(2)} / ₹{numAmount.toFixed(2)}
                  </span>
                </div>
                {activeMembers.map(m => (
                  <div key={m.user.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', fontFamily: "'Syne', sans-serif" }}>
                      {m.user.name.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm" style={{ color: '#e8eaf0' }}>{m.user.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm" style={{ color: '#8b90a0' }}>₹</span>
                      <input type="number" min="0" step="0.01"
                        value={exactAmounts[m.user.id] || ''}
                        onChange={e => setExactAmounts(p => ({ ...p, [m.user.id]: e.target.value }))}
                        placeholder="0.00"
                        className="input-glass rounded-lg px-3 py-2 text-sm w-28 text-right"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Percentages (only active members) */}
            {splitType === 'PERCENTAGE' && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs" style={{ color: '#8b90a0' }}>
                  <span>Percentages</span>
                  <span className={Math.abs(totalPct - 100) < 0.01 ? 'text-positive' : 'text-negative'}>
                    {totalPct.toFixed(1)}% / 100%
                  </span>
                </div>
                {activeMembers.map(m => (
                  <div key={m.user.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', fontFamily: "'Syne', sans-serif" }}>
                      {m.user.name.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm" style={{ color: '#e8eaf0' }}>{m.user.name}</span>
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" max="100" step="0.1"
                        value={percentages[m.user.id] || ''}
                        onChange={e => setPercentages(p => ({ ...p, [m.user.id]: e.target.value }))}
                        placeholder="0"
                        className="input-glass rounded-lg px-3 py-2 text-sm w-24 text-right"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }} />
                      <span className="text-sm" style={{ color: '#8b90a0' }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>Note</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Optional note…" className="input-glass w-full rounded-xl px-4 py-3 text-sm" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 rounded-xl py-3 text-sm">Cancel</button>
              <button type="submit" disabled={loading} className="btn-accent flex-1 rounded-xl py-3 text-sm">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {isEdit ? 'Saving…' : 'Adding…'}
                  </span>
                ) : isEdit ? 'Save changes' : 'Add expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
