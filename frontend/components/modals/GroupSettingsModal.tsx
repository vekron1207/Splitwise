'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { groupsApi, usersApi } from '@/lib/api'
import { GroupResponse, UserSummary } from '@/lib/types'
import { useAuthStore } from '@/store/auth'
import { X, Trash2, Users, Settings, Save, Search, UserPlus, AlertTriangle } from 'lucide-react'

interface Props {
  group: GroupResponse
  onClose: () => void
}

export const SIMPLIFIED_KEY = (id: number) => `simplified_balances_${id}`

export default function GroupSettingsModal({ group, onClose }: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = group.createdBy?.id === user?.userId

  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null)

  // Simplified balances toggle (persisted per group in localStorage)
  const [simplified, setSimplified] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(SIMPLIFIED_KEY(group.id))
    return stored === null ? true : stored === 'true'
  })

  // Member search
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSummary[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const existingIds = new Set(group.members?.map(m => m.user.id) ?? [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await usersApi.search(query.trim())
        setResults(res.data.filter(u => !existingIds.has(u.id)))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function toggleSimplified(val: boolean) {
    setSimplified(val)
    localStorage.setItem(SIMPLIFIED_KEY(group.id), String(val))
    qc.invalidateQueries({ queryKey: ['balances', group.id] })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await groupsApi.update(group.id, { name: name.trim(), description: description.trim() || undefined })
      qc.invalidateQueries({ queryKey: ['group', group.id] })
      qc.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Group updated!')
      onClose()
    } catch {
      toast.error('Failed to update group')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await groupsApi.delete(group.id)
      qc.invalidateQueries({ queryKey: ['groups'] })
      qc.invalidateQueries({ queryKey: ['balance-summary'] })
      toast.success('Group deleted')
      router.push('/dashboard')
    } catch {
      toast.error('Failed to delete group')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function handleAddMember(u: UserSummary) {
    setAddingId(u.id)
    try {
      await groupsApi.addMember(group.id, { email: u.email })
      qc.invalidateQueries({ queryKey: ['group', group.id] })
      toast.success(`${u.name} added!`)
      setQuery('')
      setResults([])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to add member')
    } finally {
      setAddingId(null)
    }
  }

  async function handleRemoveMember(userId: number, memberName: string) {
    setRemovingId(userId)
    setConfirmRemoveId(null)
    try {
      await groupsApi.removeMember(group.id, userId)
      qc.invalidateQueries({ queryKey: ['group', group.id] })
      toast.success(`${memberName} removed`)
    } catch {
      toast.error('Failed to remove member')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="glass rounded-2xl modal-sheet w-full max-w-md max-h-[92vh] overflow-y-auto animate-fade-up"
        onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Settings size={15} style={{ color: '#6ee7b7' }} />
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Group Settings</h2>
            </div>
            <button onClick={onClose} className="btn-ghost rounded-lg p-1.5"><X size={16} /></button>
          </div>

          {/* Edit group details (admin only) */}
          {isAdmin ? (
            <form onSubmit={handleSave} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-widest"
                  style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>Group name</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  className="input-glass w-full rounded-xl px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 uppercase tracking-widest"
                  style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  rows={2} placeholder="Optional…"
                  className="input-glass w-full rounded-xl px-4 py-3 text-sm resize-none" />
              </div>
              <button type="submit" disabled={saving || !name.trim()}
                className="btn-accent w-full rounded-xl py-2.5 text-sm flex items-center justify-center gap-2">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Saving…</>
                  : <><Save size={14} /> Save changes</>}
              </button>
            </form>
          ) : (
            <div className="mb-6 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-semibold text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>{group.name}</p>
              {group.description && <p className="text-xs mt-1" style={{ color: '#8b90a0' }}>{group.description}</p>}
            </div>
          )}

          <div className="border-t mb-5" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

          {/* Simplified balances toggle */}
          <div className="mb-5">
            <div className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ fontFamily: "'Syne', sans-serif" }}>Simplified balances</p>
                <p className="text-xs mt-0.5" style={{ color: '#8b90a0' }}>
                  {simplified ? 'Minimise transactions in Balances tab' : 'Show all individual balances'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSimplified(!simplified)}
                className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
                style={{ background: simplified ? 'rgba(110,231,183,0.8)' : 'rgba(255,255,255,0.12)' }}
              >
                <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                  style={{
                    background: simplified ? '#07070f' : '#8b90a0',
                    left: simplified ? 'calc(100% - 22px)' : '2px',
                  }} />
              </button>
            </div>
          </div>

          <div className="border-t mb-5" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

          {/* Members */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Users size={13} style={{ color: '#8b90a0' }} />
              <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                Members · {group.members?.length}
              </h3>
            </div>

            {/* Add member search (admin only) */}
            {isAdmin && (
              <div className="mb-3">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8b90a0' }} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search contacts to add…"
                    className="input-glass w-full rounded-xl pl-8 pr-4 py-2.5 text-sm"
                  />
                  {searching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"
                      style={{ color: '#8b90a0' }} />
                  )}
                </div>
                {results.length > 0 && (
                  <div className="mt-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    {results.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleAddMember(u)}
                        disabled={addingId === u.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', fontFamily: "'Syne', sans-serif" }}>
                          {u.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ fontFamily: "'Syne', sans-serif" }}>{u.name}</p>
                          <p className="text-xs truncate" style={{ color: '#8b90a0' }}>{u.email}</p>
                        </div>
                        {addingId === u.id
                          ? <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ color: '#6ee7b7' }} />
                          : <UserPlus size={13} style={{ color: '#6ee7b7', flexShrink: 0 }} />}
                      </button>
                    ))}
                  </div>
                )}
                {query.trim() && !searching && results.length === 0 && (
                  <p className="text-xs mt-2 text-center" style={{ color: '#8b90a0' }}>No registered users found</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              {group.members?.map(m => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', fontFamily: "'Syne', sans-serif" }}>
                    {m.user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {m.user.name}
                      {m.user.id === user?.userId && <span className="ml-1 font-normal text-xs" style={{ color: '#8b90a0' }}>(you)</span>}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#8b90a0' }}>{m.user.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: m.role === 'ADMIN' ? 'rgba(110,231,183,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${m.role === 'ADMIN' ? 'rgba(110,231,183,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      color: m.role === 'ADMIN' ? '#6ee7b7' : '#8b90a0',
                      fontFamily: "'Syne', sans-serif", fontWeight: 600,
                    }}>
                    {m.role}
                  </span>
                  {isAdmin && m.user.id !== user?.userId && (
                    confirmRemoveId === m.user.id ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleRemoveMember(m.user.id, m.user.name)}
                          disabled={removingId === m.user.id}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
                        >
                          {removingId === m.user.id
                            ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin block" />
                            : 'Remove'}
                        </button>
                        <button onClick={() => setConfirmRemoveId(null)} className="text-xs px-1.5 py-1 rounded-lg" style={{ color: '#8b90a0' }}>✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(m.user.id)}
                        className="p-1.5 rounded-lg flex-shrink-0 transition-all"
                        style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}
                        title="Remove member"
                      >
                        <X size={12} />
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          {isAdmin && (
            <>
              <div className="border-t mb-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
              <div className="rounded-xl p-4" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: '#f87171', fontFamily: "'Syne', sans-serif" }}>Danger zone</p>

                {confirmDelete ? (
                  <div>
                    <div className="flex items-start gap-2 mb-3">
                      <AlertTriangle size={14} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                      <p className="text-sm" style={{ color: '#f87171' }}>
                        Delete <strong>&quot;{group.name}&quot;</strong>? This removes all expenses and cannot be undone.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDelete(false)} className="btn-ghost flex-1 rounded-xl py-2 text-sm">
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-sm"
                        style={{ background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171' }}
                      >
                        {deleting
                          ? <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                          : <><Trash2 size={13} /> Yes, delete</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all"
                      style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
                      <Trash2 size={14} /> Delete this group
                    </button>
                    <p className="text-xs mt-2" style={{ color: '#8b90a0' }}>
                      Permanently removes the group and all its expenses.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
