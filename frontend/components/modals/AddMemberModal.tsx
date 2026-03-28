'use client'
import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { groupsApi, usersApi } from '@/lib/api'
import { UserSummary } from '@/lib/types'
import { X, Search, UserPlus, Check } from 'lucide-react'

interface Props {
  groupId: number
  existingMemberIds?: number[]
  onClose: () => void
}

export default function AddMemberModal({ groupId, existingMemberIds = [], onClose }: Props) {
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSummary[]>([])
  const [selected, setSelected] = useState<UserSummary[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const excludeIds = new Set([...existingMemberIds, ...selected.map(s => s.id)])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await usersApi.search(query.trim())
        setResults(res.data.filter(u => !excludeIds.has(u.id)))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function toggle(user: UserSummary) {
    setSelected(prev =>
      prev.some(s => s.id === user.id)
        ? prev.filter(s => s.id !== user.id)
        : [...prev, user]
    )
    setQuery('')
    setResults([])
  }

  async function handleAdd() {
    if (selected.length === 0) return
    setAdding(true)
    let addedCount = 0
    for (const u of selected) {
      try {
        await groupsApi.addMember(groupId, { email: u.email })
        addedCount++
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        toast.error(msg || `Failed to add ${u.name}`)
      }
    }
    if (addedCount > 0) {
      qc.invalidateQueries({ queryKey: ['group', groupId] })
      toast.success(`${addedCount} member${addedCount > 1 ? 's' : ''} added!`)
      onClose()
    }
    setAdding(false)
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="glass rounded-2xl modal-sheet w-full max-w-md max-h-[85vh] overflow-y-auto animate-fade-up"
        onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Add Members</h2>
            <button onClick={onClose} className="btn-ghost rounded-lg p-1.5"><X size={16} /></button>
          </div>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {selected.map(u => (
                <span key={u.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(110,231,183,0.15)', border: '1px solid rgba(110,231,183,0.3)', color: '#6ee7b7', fontFamily: "'Syne', sans-serif" }}>
                  {u.name}
                  <button type="button" onClick={() => toggle(u)} className="hover:opacity-70 transition-opacity">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8b90a0' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              autoFocus
              className="input-glass w-full rounded-xl pl-8 pr-4 py-3 text-sm"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin"
                style={{ color: '#8b90a0' }} />
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {results.map(u => {
                const isSelected = selected.some(s => s.id === u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                    style={{ background: isSelected ? 'rgba(110,231,183,0.08)' : 'rgba(255,255,255,0.03)' }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', fontFamily: "'Syne', sans-serif" }}>
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ fontFamily: "'Syne', sans-serif" }}>{u.name}</p>
                      <p className="text-xs truncate" style={{ color: '#8b90a0' }}>{u.email}</p>
                    </div>
                    {isSelected
                      ? <Check size={14} style={{ color: '#6ee7b7', flexShrink: 0 }} />
                      : <UserPlus size={13} style={{ color: '#8b90a0', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          )}

          {query.trim() && !searching && results.length === 0 && (
            <p className="text-xs text-center py-3" style={{ color: '#8b90a0' }}>No registered users found for &quot;{query}&quot;</p>
          )}

          {!query.trim() && selected.length === 0 && (
            <p className="text-xs text-center py-3" style={{ color: '#3a3f52' }}>Start typing to find people</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 rounded-xl py-3 text-sm">Cancel</button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || selected.length === 0}
              className="btn-accent flex-1 rounded-xl py-3 text-sm"
            >
              {adding ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Adding…
                </span>
              ) : selected.length > 0 ? `Add ${selected.length} member${selected.length > 1 ? 's' : ''}` : 'Add member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
