'use client'
import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { groupsApi, usersApi } from '@/lib/api'
import { UserSummary } from '@/lib/types'
import { X, Search, UserPlus, Check } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function CreateGroupModal({ onClose }: Props) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSummary[]>([])
  const [selected, setSelected] = useState<UserSummary[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await usersApi.search(query.trim())
        setResults(res.data.filter(u => !selected.some(s => s.id === u.id)))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, selected])

  function toggle(user: UserSummary) {
    setSelected(prev =>
      prev.some(s => s.id === user.id)
        ? prev.filter(s => s.id !== user.id)
        : [...prev, user]
    )
    setQuery('')
    setResults([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await groupsApi.create({ name: name.trim(), description: description.trim() || undefined })
      const groupId = res.data.id
      for (const u of selected) {
        await groupsApi.addMember(groupId, { email: u.email })
      }
      qc.invalidateQueries({ queryKey: ['groups'] })
      toast.success(`Group "${name.trim()}" created${selected.length ? ` with ${selected.length} member${selected.length > 1 ? 's' : ''}` : ''}!`)
      onClose()
    } catch {
      toast.error('Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="glass rounded-2xl modal-sheet w-full max-w-md max-h-[92vh] overflow-y-auto animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>New Group</h2>
            <button onClick={onClose} className="btn-ghost rounded-lg p-1.5">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                Group name *
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Goa Trip 2026"
                className="input-glass w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional…"
                rows={2}
                className="input-glass w-full rounded-xl px-4 py-3 text-sm resize-none"
              />
            </div>

            {/* Contact search */}
            <div>
              <label className="block text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                Add members
              </label>

              {/* Selected chips */}
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
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

              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8b90a0' }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name or email…"
                  className="input-glass w-full rounded-xl pl-8 pr-4 py-2.5 text-sm"
                />
                {searching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"
                    style={{ color: '#8b90a0' }} />
                )}
              </div>

              {results.length > 0 && (
                <div className="mt-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  {results.map(u => {
                    const isSelected = selected.some(s => s.id === u.id)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggle(u)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                        style={{ background: isSelected ? 'rgba(110,231,183,0.08)' : 'rgba(255,255,255,0.04)' }}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
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
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 rounded-xl py-3 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={loading || !name.trim()} className="btn-accent flex-1 rounded-xl py-3 text-sm">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating…
                  </span>
                ) : `Create${selected.length ? ` · ${selected.length + 1} members` : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
