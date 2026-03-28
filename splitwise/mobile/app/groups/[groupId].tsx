import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator, Alert, FlatList,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import { groupsApi, expensesApi, balancesApi, settlementsApi, usersApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { C } from '@/constants/colors'
import {
  ExpenseResponse, MemberResponse, SplitType, SimplifiedDebtResponse, UserSummary,
} from '@/lib/types'

type Tab = 'expenses' | 'balances' | 'members'

const EXPENSE_EMOJI: Record<string, string> = {
  food: '🍔', dinner: '🍽️', lunch: '🥗', breakfast: '☕',
  travel: '✈️', flight: '✈️', uber: '🚗', taxi: '🚕', petrol: '⛽',
  hotel: '🏨', airbnb: '🏠', stay: '🏠',
  movie: '🎬', netflix: '📺', game: '🎮',
  grocery: '🛒', shopping: '🛍️',
  electricity: '⚡', wifi: '📶', bill: '📄',
}
function getEmoji(title: string) {
  const t = title.toLowerCase()
  return Object.entries(EXPENSE_EMOJI).find(([k]) => t.includes(k))?.[1] ?? '📦'
}

export default function GroupScreen() {
  const { groupId: rawId } = useLocalSearchParams()
  const groupId = Number(rawId)
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('expenses')
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [editExpense, setEditExpense] = useState<ExpenseResponse | null>(null)

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.get(groupId).then(r => r.data),
  })

  const { data: expensePage, isLoading: expLoading, refetch: refetchExp } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => expensesApi.list(groupId).then(r => r.data),
  })

  const { data: simplified } = useQuery({
    queryKey: ['balances', groupId, 'simplified'],
    queryFn: () => balancesApi.simplified(groupId).then(r => r.data),
    enabled: tab === 'balances',
  })

  const expenses = expensePage?.content ?? []
  const members = group?.members ?? []
  const isAdmin = group?.createdBy?.id === user?.userId

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['expenses', groupId] })
    qc.invalidateQueries({ queryKey: ['balances', groupId] })
    qc.invalidateQueries({ queryKey: ['balance-summary'] })
  }

  async function handleDeleteExpense(exp: ExpenseResponse) {
    Alert.alert('Delete expense', `Delete "${exp.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await expensesApi.delete(groupId, exp.id)
            invalidateAll()
          } catch { Alert.alert('Error', 'Failed to delete') }
        }
      },
    ])
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerTitle}>
          <Text style={s.title} numberOfLines={1}>{group?.name ?? '…'}</Text>
          {group?.description ? <Text style={s.subtitle} numberOfLines={1}>{group.description}</Text> : null}
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {(['expenses', 'balances', 'members'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {tab === 'expenses' && (
          expLoading ? <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} /> :
          expenses.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🧾</Text>
              <Text style={s.emptyTitle}>No expenses yet</Text>
              <Text style={s.emptySub}>Tap + to add the first one</Text>
            </View>
          ) : (
            expenses.map(exp => (
              <ExpenseCard key={exp.id} expense={exp} currentUserId={user?.userId ?? 0}
                isAdmin={isAdmin}
                onEdit={() => setEditExpense(exp)}
                onDelete={() => handleDeleteExpense(exp)} />
            ))
          )
        )}

        {tab === 'balances' && (
          !simplified || simplified.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>✅</Text>
              <Text style={[s.emptyTitle, { color: C.accent }]}>All settled up!</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={s.sectionLabel}>SIMPLIFIED DEBTS</Text>
              {(simplified as SimplifiedDebtResponse[]).map((d, i) => (
                <View key={i} style={s.balanceCard}>
                  <View style={s.balanceAvatar}>
                    <Text style={s.balanceAvatarText}>{d.fromUserName.charAt(0)}</Text>
                  </View>
                  <Text style={s.balanceText} numberOfLines={2}>
                    <Text style={{ color: C.text1, fontWeight: '700' }}>{d.fromUserName}</Text>
                    <Text style={{ color: C.text2 }}> owes </Text>
                    <Text style={{ color: C.text1, fontWeight: '700' }}>{d.toUserName}</Text>
                  </Text>
                  <Text style={[s.balanceAmount, { color: C.negative }]}>₹{Number(d.amount).toFixed(0)}</Text>
                </View>
              ))}
            </View>
          )
        )}

        {tab === 'members' && (
          <View style={{ gap: 10 }}>
            {members.map(m => (
              <View key={m.id} style={s.memberCard}>
                <View style={s.memberAvatar}>
                  <Text style={s.memberAvatarText}>{m.user.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.memberName}>
                    {m.user.name}
                    {m.user.id === user?.userId && <Text style={{ color: C.text2 }}> (you)</Text>}
                  </Text>
                  <Text style={s.memberEmail}>{m.user.email}</Text>
                </View>
                <View style={[s.roleBadge, m.role === 'ADMIN' && s.roleBadgeAdmin]}>
                  <Text style={[s.roleText, m.role === 'ADMIN' && { color: C.accent }]}>{m.role}</Text>
                </View>
              </View>
            ))}
            {isAdmin && (
              <TouchableOpacity style={s.addMemberBtn} onPress={() => setShowAddMember(true)}>
                <Text style={{ color: C.accent, fontWeight: '600', fontSize: 15 }}>+ Add member</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <View style={s.fab}>
        <TouchableOpacity style={s.fabBtn} onPress={() => setShowAddExpense(true)} activeOpacity={0.85}>
          <Text style={s.fabText}>+ Add expense</Text>
        </TouchableOpacity>
      </View>

      {(showAddExpense || editExpense) && (
        <AddExpenseModal
          groupId={groupId}
          members={members}
          editExpense={editExpense ?? undefined}
          onClose={() => { setShowAddExpense(false); setEditExpense(null) }}
          onSaved={invalidateAll}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          groupId={groupId}
          existingIds={members.map(m => m.user.id)}
          onClose={() => setShowAddMember(false)}
          onAdded={() => qc.invalidateQueries({ queryKey: ['group', groupId] })}
        />
      )}
    </SafeAreaView>
  )
}

// ── ExpenseCard ────────────────────────────────────────────────────────────
function ExpenseCard({ expense, currentUserId, isAdmin, onEdit, onDelete }:
  { expense: ExpenseResponse; currentUserId: number; isAdmin: boolean; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const myShare = expense.splits.find(s => s.userId === currentUserId)?.amount ?? 0
  const perPerson = Number(expense.amount) / Math.max(expense.splits.length, 1)

  return (
    <TouchableOpacity style={ec.card} onPress={() => setExpanded(e => !e)} activeOpacity={0.85}>
      <View style={ec.row}>
        <View style={ec.emoji}>
          <Text style={{ fontSize: 22 }}>{getEmoji(expense.title)}</Text>
        </View>
        <View style={ec.info}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={ec.title}>{expense.title}</Text>
            <View style={ec.badge}><Text style={ec.badgeText}>{expense.splitType}</Text></View>
          </View>
          <Text style={ec.meta}>
            Paid by <Text style={{ color: C.text1 }}>{expense.paidBy.name}</Text>
            {' · '}{new Date(expense.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={ec.amount}>₹{Number(expense.amount).toFixed(0)}</Text>
          <Text style={ec.perPerson}>₹{perPerson.toFixed(0)}/ea</Text>
        </View>
      </View>

      {expanded && (
        <View style={ec.expanded}>
          <View style={ec.divider} />
          <Text style={ec.splitTitle}>SPLIT BREAKDOWN</Text>
          {expense.splits.map(split => (
            <View key={split.userId} style={ec.splitRow}>
              <Text style={[ec.splitName, split.userId === currentUserId && { color: C.accent }]}>
                {split.userName}{split.userId === currentUserId ? ' (you)' : ''}
                {expense.paidBy.id === split.userId ? ' · paid' : ''}
              </Text>
              <Text style={[ec.splitAmount, { color: split.userId === currentUserId ? C.accent : C.text2 }]}>
                ₹{Number(split.amount).toFixed(2)}
              </Text>
            </View>
          ))}
          {(isAdmin || expense.paidBy.id === currentUserId) && (
            <View style={ec.actions}>
              <TouchableOpacity style={ec.editBtn} onPress={onEdit}>
                <Text style={{ color: C.text2, fontSize: 13, fontWeight: '600' }}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ec.deleteBtn} onPress={onDelete}>
                <Text style={{ color: C.danger, fontSize: 13, fontWeight: '600' }}>🗑 Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
}

// ── AddExpenseModal ────────────────────────────────────────────────────────
function AddExpenseModal({ groupId, members, editExpense, onClose, onSaved }:
  { groupId: number; members: MemberResponse[]; editExpense?: ExpenseResponse; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuthStore()
  const isEdit = !!editExpense
  const [title, setTitle] = useState(editExpense?.title ?? '')
  const [amount, setAmount] = useState(editExpense ? String(editExpense.amount) : '')
  const [splitType, setSplitType] = useState<SplitType>(editExpense?.splitType ?? 'EQUAL')
  const [paidBy, setPaidBy] = useState(editExpense?.paidBy?.id ?? user?.userId ?? 0)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    editExpense?.splits?.length
      ? new Set(editExpense.splits.map(s => s.userId))
      : new Set(members.map(m => m.user.id))
  )
  const [loading, setLoading] = useState(false)

  const activeMembers = members.filter(m => selectedIds.has(m.user.id))
  const numAmount = parseFloat(amount) || 0
  const equalShare = activeMembers.length > 0 ? numAmount / activeMembers.length : 0

  function toggleMember(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size === 1) return prev; next.delete(id) }
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    if (!title.trim() || numAmount <= 0) { Alert.alert('Error', 'Title and amount required'); return }
    const splits = activeMembers.map(m => ({ userId: m.user.id }))
    const payload = { title: title.trim(), amount: numAmount, splitType, category: 'OTHER', paidBy, splits }
    setLoading(true)
    try {
      if (isEdit && editExpense) await expensesApi.update(groupId, editExpense.id, payload)
      else await expensesApi.create(groupId, payload)
      onSaved(); onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      Alert.alert('Error', msg || 'Failed to save expense')
    } finally { setLoading(false) }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={ae.container}>
        <View style={ae.handle} />
        <View style={ae.header}>
          <Text style={ae.title}>{isEdit ? 'Edit Expense' : 'Add Expense'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={ae.close}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={ae.label}>TITLE *</Text>
          <TextInput style={ae.input} value={title} onChangeText={setTitle}
            placeholder="Dinner at Barbeque Nation" placeholderTextColor={C.text3} />

          <Text style={[ae.label, { marginTop: 16 }]}>AMOUNT (₹) *</Text>
          <TextInput style={ae.input} value={amount} onChangeText={setAmount}
            placeholder="0.00" placeholderTextColor={C.text3}
            keyboardType="decimal-pad" />

          <Text style={[ae.label, { marginTop: 16 }]}>PAID BY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {members.map(m => (
                <TouchableOpacity key={m.user.id} style={[ae.paidChip, paidBy === m.user.id && ae.paidChipActive]}
                  onPress={() => setPaidBy(m.user.id)}>
                  <Text style={[ae.paidChipText, paidBy === m.user.id && { color: C.accent }]}>{m.user.name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[ae.label, { marginTop: 16 }]}>SPLIT TYPE</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
            {(['EQUAL', 'EXACT', 'PERCENTAGE'] as SplitType[]).map(t => (
              <TouchableOpacity key={t} style={[ae.typeChip, splitType === t && ae.typeChipActive]}
                onPress={() => setSplitType(t)}>
                <Text style={[ae.typeChipText, splitType === t && { color: C.accent }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={ae.row}>
            <Text style={ae.label}>SPLIT BETWEEN</Text>
            <TouchableOpacity onPress={() => setSelectedIds(new Set(members.map(m => m.user.id)))}>
              <Text style={{ color: C.accent, fontSize: 12 }}>All</Text>
            </TouchableOpacity>
          </View>
          {members.map(m => {
            const checked = selectedIds.has(m.user.id)
            return (
              <TouchableOpacity key={m.user.id} style={[ae.memberRow, checked && ae.memberRowActive]}
                onPress={() => toggleMember(m.user.id)} activeOpacity={0.7}>
                <View style={[ae.checkbox, checked && ae.checkboxActive]}>
                  {checked && <Text style={{ color: C.bg, fontSize: 11, fontWeight: '800' }}>✓</Text>}
                </View>
                <Text style={[ae.memberName, { color: checked ? C.text1 : C.text2 }]}>{m.user.name}</Text>
                {checked && splitType === 'EQUAL' && numAmount > 0 && (
                  <Text style={{ color: C.accent, fontSize: 13, fontWeight: '600' }}>₹{equalShare.toFixed(2)}</Text>
                )}
              </TouchableOpacity>
            )
          })}

          <TouchableOpacity style={[ae.saveBtn, loading && { opacity: 0.5 }]}
            onPress={handleSave} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color={C.bg} /> : <Text style={ae.saveBtnText}>{isEdit ? 'Save changes' : 'Add expense'}</Text>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── AddMemberModal ─────────────────────────────────────────────────────────
function AddMemberModal({ groupId, existingIds, onClose, onAdded }:
  { groupId: number; existingIds: number[]; onClose: () => void; onAdded: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSummary[]>([])
  const [selected, setSelected] = useState<UserSummary[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)

  async function search(q: string) {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = await usersApi.search(q)
      const excludeIds = new Set([...existingIds, ...selected.map(s => s.id)])
      setResults(res.data.filter(u => !excludeIds.has(u.id)))
    } catch { setResults([]) }
    finally { setSearching(false) }
  }

  function toggle(u: UserSummary) {
    setSelected(prev => prev.some(s => s.id === u.id) ? prev.filter(s => s.id !== u.id) : [...prev, u])
    setQuery(''); setResults([])
  }

  async function handleAdd() {
    if (!selected.length) return
    setAdding(true)
    for (const u of selected) {
      try { await groupsApi.addMember(groupId, { email: u.email }) }
      catch { Alert.alert('Error', `Could not add ${u.name}`) }
    }
    onAdded(); onClose()
    setAdding(false)
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={am.container}>
        <View style={ae.handle} />
        <View style={ae.header}>
          <Text style={ae.title}>Add Members</Text>
          <TouchableOpacity onPress={onClose}><Text style={ae.close}>✕</Text></TouchableOpacity>
        </View>
        {selected.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {selected.map(u => (
                <TouchableOpacity key={u.id} style={am.chip} onPress={() => toggle(u)}>
                  <Text style={am.chipText}>{u.name} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
        <View style={am.searchWrap}>
          <TextInput style={am.searchInput} value={query} onChangeText={search}
            placeholder="Search by name or email…" placeholderTextColor={C.text3} autoFocus />
          {searching && <ActivityIndicator color={C.accent} style={{ position: 'absolute', right: 16, top: 14 }} />}
        </View>
        {results.map(u => (
          <TouchableOpacity key={u.id} style={am.result} onPress={() => toggle(u)}>
            <View style={am.resultAvatar}><Text style={am.resultAvatarText}>{u.name.charAt(0)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text1, fontWeight: '600' }}>{u.name}</Text>
              <Text style={{ color: C.text2, fontSize: 12 }}>{u.email}</Text>
            </View>
            <Text style={{ color: C.accent }}>+</Text>
          </TouchableOpacity>
        ))}
        {query && !searching && results.length === 0 && (
          <Text style={{ color: C.text2, textAlign: 'center', marginTop: 20 }}>No users found</Text>
        )}
        <TouchableOpacity
          style={[ae.saveBtn, { marginTop: 20 }, (!selected.length || adding) && { opacity: 0.4 }]}
          onPress={handleAdd} disabled={!selected.length || adding}>
          {adding ? <ActivityIndicator color={C.bg} /> :
            <Text style={ae.saveBtnText}>{selected.length ? `Add ${selected.length} member${selected.length > 1 ? 's' : ''}` : 'Add member'}</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 32, color: C.text2, lineHeight: 36 },
  headerTitle: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: C.text1 },
  subtitle: { fontSize: 13, color: C.text2, marginTop: 2 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.accent },
  tabText: { fontSize: 13, color: C.text2, fontWeight: '600' },
  tabTextActive: { color: C.accent },
  scroll: { flex: 1 },
  fab: { position: 'absolute', bottom: 24, left: 20, right: 20 },
  fabBtn: { backgroundColor: C.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  fabText: { color: C.bg, fontWeight: '800', fontSize: 16 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: C.text1, fontSize: 18, fontWeight: '700' },
  emptySub: { color: C.text2, fontSize: 14, marginTop: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: C.text2, letterSpacing: 1.5, marginBottom: 8 },
  balanceCard: { backgroundColor: C.glass, borderRadius: 14, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  balanceAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(248,113,113,0.15)', alignItems: 'center', justifyContent: 'center' },
  balanceAvatarText: { color: C.negative, fontWeight: '700' },
  balanceText: { flex: 1, fontSize: 14 },
  balanceAmount: { fontSize: 15, fontWeight: '800' },
  memberCard: { backgroundColor: C.glass, borderRadius: 14, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: C.accent, fontWeight: '700' },
  memberName: { color: C.text1, fontWeight: '600', fontSize: 14 },
  memberEmail: { color: C.text2, fontSize: 12 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.border },
  roleBadgeAdmin: { backgroundColor: C.accentDim, borderColor: 'rgba(110,231,183,0.3)' },
  roleText: { fontSize: 11, fontWeight: '700', color: C.text2 },
  addMemberBtn: { borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingVertical: 14, alignItems: 'center', borderStyle: 'dashed' },
})

const ec = StyleSheet.create({
  card: { backgroundColor: C.glass, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  emoji: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { color: C.text1, fontWeight: '700', fontSize: 14 },
  badge: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: C.text2, fontSize: 10, fontWeight: '700' },
  meta: { color: C.text2, fontSize: 12, marginTop: 3 },
  amount: { color: C.positive, fontWeight: '800', fontSize: 15 },
  perPerson: { color: C.text2, fontSize: 11, marginTop: 2 },
  expanded: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 12 },
  splitTitle: { fontSize: 10, fontWeight: '700', color: C.text2, letterSpacing: 1.5, marginBottom: 8 },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  splitName: { color: C.text2, fontSize: 13 },
  splitAmount: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  deleteBtn: { flex: 1, backgroundColor: C.dangerDim, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
})

const ae = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 24, paddingTop: 12 },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: C.text1 },
  close: { fontSize: 18, color: C.text2, padding: 4 },
  label: { fontSize: 10, fontWeight: '700', color: C.text2, letterSpacing: 1.5, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: C.border, color: C.text1,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
  },
  paidChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.border },
  paidChipActive: { backgroundColor: C.accentDim, borderColor: 'rgba(110,231,183,0.4)' },
  paidChipText: { color: C.text2, fontSize: 13, fontWeight: '600' },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  typeChipActive: { backgroundColor: C.accentDim, borderColor: 'rgba(110,231,183,0.4)' },
  typeChipText: { color: C.text2, fontSize: 12, fontWeight: '700' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: C.border },
  memberRowActive: { backgroundColor: 'rgba(110,231,183,0.06)', borderColor: 'rgba(110,231,183,0.2)' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: C.accent, borderColor: C.accent },
  memberName: { flex: 1, fontSize: 14, fontWeight: '500' },
  saveBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: C.bg, fontWeight: '800', fontSize: 15 },
})

const am = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 24, paddingTop: 12 },
  chip: { backgroundColor: C.accentDim, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(110,231,183,0.3)' },
  chipText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  searchWrap: { position: 'relative', marginBottom: 12 },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, borderWidth: 1, borderColor: C.border, color: C.text1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.04)' },
  resultAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' },
  resultAvatarText: { color: C.accent, fontWeight: '700' },
})
