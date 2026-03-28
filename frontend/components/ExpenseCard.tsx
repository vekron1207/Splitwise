'use client'
import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { expensesApi, attachmentsApi } from '@/lib/api'
import { ExpenseResponse, AttachmentResponse } from '@/lib/types'
import { ChevronDown, ChevronUp, Pencil, Trash2, Paperclip, Download, X, ImageIcon } from 'lucide-react'

const CATEGORY_EMOJI: Record<string, string> = {
  FOOD: '🍔',
  TRAVEL: '✈️',
  UTILITIES: '⚡',
  ACCOMMODATION: '🏠',
  OTHER: '📦',
}

// Auto-assign emoji based on expense title keywords
function inferEmoji(title: string, category: string): string {
  const t = title.toLowerCase()
  if (t.includes('food') || t.includes('dinner') || t.includes('lunch') || t.includes('breakfast') || t.includes('restaurant') || t.includes('cafe') || t.includes('pizza') || t.includes('burger')) return '🍔'
  if (t.includes('uber') || t.includes('ola') || t.includes('taxi') || t.includes('cab') || t.includes('flight') || t.includes('train') || t.includes('bus') || t.includes('travel')) return '✈️'
  if (t.includes('hotel') || t.includes('airbnb') || t.includes('rent') || t.includes('hostel') || t.includes('stay') || t.includes('accommodation')) return '🏠'
  if (t.includes('electric') || t.includes('wifi') || t.includes('internet') || t.includes('gas') || t.includes('water') || t.includes('utility') || t.includes('bill')) return '⚡'
  if (t.includes('movie') || t.includes('netflix') || t.includes('cinema') || t.includes('ticket')) return '🎬'
  if (t.includes('grocery') || t.includes('supermarket') || t.includes('vegetables') || t.includes('fruits')) return '🛒'
  if (t.includes('medicine') || t.includes('hospital') || t.includes('doctor') || t.includes('pharmacy')) return '💊'
  if (t.includes('gym') || t.includes('sport') || t.includes('fitness')) return '🏋️'
  if (t.includes('party') || t.includes('birthday') || t.includes('celebration')) return '🎉'
  if (t.includes('coffee') || t.includes('tea') || t.includes('starbucks')) return '☕'
  if (t.includes('beer') || t.includes('alcohol') || t.includes('bar') || t.includes('drinks')) return '🍺'
  return CATEGORY_EMOJI[category] ?? '📦'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  expense: ExpenseResponse
  groupId: number
  currentUserId: number
  isAdmin: boolean
  style?: React.CSSProperties
  onEdit: () => void
  onDeleted: () => void
}

export default function ExpenseCard({ expense, groupId, currentUserId, isAdmin, style, onEdit, onDeleted }: Props) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState<AttachmentResponse[]>(expense.attachments ?? [])
  const fileRef = useRef<HTMLInputElement>(null)

  const canEdit = expense.paidBy.id === currentUserId || isAdmin
  const emoji = inferEmoji(expense.title, expense.category)

  async function handleDelete() {
    if (!confirm('Delete this expense?')) return
    setDeleting(true)
    try {
      await expensesApi.delete(groupId, expense.id)
      toast.success('Expense deleted')
      onDeleted()
    } catch {
      toast.error('Failed to delete')
      setDeleting(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB'); return }
    setUploading(true)
    try {
      const res = await attachmentsApi.upload(groupId, expense.id, file)
      setAttachments(prev => [...prev, res.data])
      toast.success('File attached!')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDeleteAttachment(attachmentId: number) {
    try {
      await attachmentsApi.delete(attachmentId)
      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
      toast.success('Attachment removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  const isImage = (ct: string) => ct.startsWith('image/')

  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-up" style={style}>
      {/* Main row */}
      <div
        className="px-5 py-4 flex items-center gap-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Emoji */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm" style={{ fontFamily: "'Syne', sans-serif", color: '#e8eaf0' }}>
              {expense.title}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#8b90a0' }}>
              {expense.splitType}
            </span>
            {attachments.length > 0 && (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#8b90a0' }}>
                <Paperclip size={10} />{attachments.length}
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#8b90a0' }}>
            Paid by <span style={{ color: '#c8cad4' }}>{expense.paidBy.name}</span>
            {' · '}{new Date(expense.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="font-mono font-semibold text-sm text-positive">₹{Number(expense.amount).toFixed(2)}</p>
            <p className="text-xs" style={{ color: '#8b90a0' }}>
              ₹{(Number(expense.amount) / Math.max(expense.splits.length, 1)).toFixed(2)}/person
            </p>
          </div>
          {expanded ? <ChevronUp size={14} style={{ color: '#8b90a0' }} /> : <ChevronDown size={14} style={{ color: '#8b90a0' }} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>

          {/* Description */}
          {expense.description && (
            <p className="text-sm" style={{ color: '#8b90a0' }}>{expense.description}</p>
          )}

          {/* Splits */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
              Split breakdown
            </p>
            <div className="space-y-1.5">
              {expense.splits.map(split => {
                const isYou = split.userId === currentUserId
                const isPayer = expense.paidBy.id === split.userId
                return (
                  <div key={split.userId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: isYou ? 'rgba(110,231,183,0.2)' : 'rgba(255,255,255,0.06)', color: isYou ? '#6ee7b7' : '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                        {split.userName.charAt(0)}
                      </div>
                      <span style={{ color: isYou ? '#e8eaf0' : '#c8cad4' }}>
                        {split.userName}{isYou && ' (you)'}
                        {isPayer && <span className="ml-1 text-xs" style={{ color: '#6ee7b7' }}>· paid</span>}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono" style={{ color: isYou ? '#6ee7b7' : '#8b90a0' }}>
                        ₹{Number(split.amount).toFixed(2)}
                      </span>
                      {split.percentage != null && (
                        <span className="ml-1 text-xs" style={{ color: '#3a3f52' }}>({Number(split.percentage).toFixed(1)}%)</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8b90a0', fontFamily: "'Syne', sans-serif" }}>
                Attachments {attachments.length > 0 && `(${attachments.length})`}
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{ background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)', color: '#6ee7b7' }}
              >
                {uploading ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <Paperclip size={11} />}
                {uploading ? 'Uploading…' : 'Attach file'}
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" />
            </div>

            {attachments.length === 0 ? (
              <p className="text-xs" style={{ color: '#3a3f52' }}>No attachments yet. Attach receipts, bills, or images.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {isImage(att.contentType) ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/attachments/${att.id}`}
                          alt={att.originalName}
                          className="w-full h-28 object-cover"
                        />
                        <div className="absolute inset-0 flex items-end p-2"
                          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
                          <span className="text-xs text-white truncate flex-1">{att.originalName}</span>
                          <button onClick={() => handleDeleteAttachment(att.id)}
                            className="ml-1 p-1 rounded" style={{ background: 'rgba(248,113,113,0.3)' }}>
                            <X size={10} style={{ color: '#f87171' }} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(110,231,183,0.1)' }}>
                          <ImageIcon size={14} style={{ color: '#6ee7b7' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: '#e8eaf0' }}>{att.originalName}</p>
                          <p className="text-xs" style={{ color: '#8b90a0' }}>{formatBytes(att.fileSize)}</p>
                        </div>
                        <div className="flex gap-1">
                          <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/attachments/${att.id}`}
                            target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg" style={{ background: 'rgba(110,231,183,0.1)' }}>
                            <Download size={11} style={{ color: '#6ee7b7' }} />
                          </a>
                          <button onClick={() => handleDeleteAttachment(att.id)}
                            className="p-1.5 rounded-lg" style={{ background: 'rgba(248,113,113,0.1)' }}>
                            <X size={11} style={{ color: '#f87171' }} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-2 pt-1">
              <button onClick={onEdit}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.2)', color: '#6ee7b7' }}>
                <Pencil size={12} /> Edit expense
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                {deleting
                  ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  : <Trash2 size={12} />}
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
