'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { settlementsApi } from '@/lib/api'
import { SimplifiedDebtResponse } from '@/lib/types'
import { useAuthStore } from '@/store/auth'
import { X } from 'lucide-react'

interface Props {
  groupId: number
  debts: SimplifiedDebtResponse[]
  onClose: () => void
}

export default function SettleUpModal({ groupId, debts, onClose }: Props) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [selectedDebt, setSelectedDebt] = useState<SimplifiedDebtResponse | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  // Debts where current user owes someone
  const myDebts = debts.filter(d => d.fromUserId === user?.userId)

  function selectDebt(debt: SimplifiedDebtResponse) {
    setSelectedDebt(debt)
    setAmount(String(debt.amount))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDebt) return
    const num = parseFloat(amount)
    if (!num || num <= 0) { toast.error('Enter a valid amount'); return }
    setLoading(true)
    try {
      await settlementsApi.create(groupId, {
        paidTo: selectedDebt.toUserId,
        amount: num,
        note: note.trim() || undefined,
      })
      qc.invalidateQueries({ queryKey: ['balances', groupId] })
      qc.invalidateQueries({ queryKey: ['settlements', groupId] })
      toast.success('Settlement recorded!')
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to record settlement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="glass rounded-2xl modal-sheet p-6 w-full max-w-md animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Settle Up</h2>
          <button onClick={onClose} className="btn-ghost rounded-lg p-1.5"><X size={16} /></button>
        </div>

        {myDebts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-sm font-medium" style={{ color: '#6ee7b7', fontFamily: "'Syne', sans-serif" }}>You&apos;re all settled up!</p>
            <p className="text-xs mt-1" style={{ color: '#8b90a0' }}>No outstanding debts in this group.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium mb-3 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                Select who to pay
              </label>
              <div className="space-y-2">
                {myDebts.map((debt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDebt(debt)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all"
                    style={{
                      background: selectedDebt === debt ? 'rgba(110,231,183,0.1)' : 'var(--glass)',
                      border: `1px solid ${selectedDebt === debt ? 'rgba(110,231,183,0.4)' : 'var(--border)'}`,
                    }}
                  >
                    <span style={{ color: '#e8eaf0' }}>Pay <strong>{debt.toUserName}</strong></span>
                    <span className="font-mono text-negative">₹{Number(debt.amount).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedDebt && (
              <>
                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>Amount (₹)</label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    className="input-glass w-full rounded-xl px-4 py-3 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>Note</label>
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Optional note…"
                    className="input-glass w-full rounded-xl px-4 py-3 text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 rounded-xl py-3 text-sm">Cancel</button>
              <button type="submit" disabled={loading || !selectedDebt} className="btn-accent flex-1 rounded-xl py-3 text-sm">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : 'Record payment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
