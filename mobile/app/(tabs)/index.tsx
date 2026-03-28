import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { groupsApi, usersApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { C } from '@/constants/colors'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function DashboardScreen() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: groups, isLoading: groupsLoading, refetch } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list().then(r => r.data),
  })

  const { data: summary } = useQuery({
    queryKey: ['balance-summary'],
    queryFn: () => usersApi.balanceSummary().then(r => r.data),
  })

  const net = summary?.netBalance ?? 0

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={C.accent} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hey, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={s.sub}>{groups?.length ?? 0} group{groups?.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={s.newBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
            <Text style={s.newBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Balance cards */}
        <View style={s.cards}>
          <BalanceCard label="Owed to you" amount={summary?.totalOwed ?? 0} color={C.positive} />
          <BalanceCard
            label="Net balance"
            amount={Math.abs(net)}
            color={net >= 0 ? C.positive : C.negative}
            prefix={net > 0 ? '+' : net < 0 ? '-' : ''}
          />
          <BalanceCard label="You owe" amount={summary?.totalOwe ?? 0} color={C.negative} />
        </View>

        {/* Groups */}
        <Text style={s.sectionTitle}>YOUR GROUPS</Text>
        {groupsLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
        ) : !groups?.length ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={s.emptyTitle}>No groups yet</Text>
            <Text style={s.emptySub}>Create a group to start splitting</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
              <Text style={s.newBtnText}>Create first group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.groupList}>
            {groups.map(g => (
              <TouchableOpacity
                key={g.id}
                style={s.groupCard}
                onPress={() => router.push(`/groups/${g.id}`)}
                activeOpacity={0.75}
              >
                <View style={s.groupAvatar}>
                  <Text style={s.groupAvatarText}>{g.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={s.groupInfo}>
                  <Text style={s.groupName}>{g.name}</Text>
                  {g.description ? <Text style={s.groupDesc} numberOfLines={1}>{g.description}</Text> : null}
                  <Text style={s.groupMeta}>{g.members?.length ?? 0} members</Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      <CreateGroupModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['groups'] }) }}
      />
    </SafeAreaView>
  )
}

function BalanceCard({ label, amount, color, prefix = '' }: { label: string; amount: number; color: string; prefix?: string }) {
  return (
    <View style={sc.card}>
      <Text style={sc.cardLabel}>{label}</Text>
      <Text style={[sc.cardAmount, { color }]}>
        {prefix}₹{amount.toFixed(0)}
      </Text>
    </View>
  )
}

function CreateGroupModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)

  async function create() {
    if (!name.trim()) { Alert.alert('Error', 'Group name is required'); return }
    setLoading(true)
    try {
      await groupsApi.create({ name: name.trim(), description: desc.trim() || undefined })
      setName(''); setDesc('')
      onCreated()
    } catch {
      Alert.alert('Error', 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={m.container}>
        <View style={m.handle} />
        <View style={m.header}>
          <Text style={m.title}>New Group</Text>
          <TouchableOpacity onPress={onClose}><Text style={m.close}>✕</Text></TouchableOpacity>
        </View>
        <Text style={m.label}>GROUP NAME *</Text>
        <TextInput style={m.input} value={name} onChangeText={setName}
          placeholder="Goa Trip 2026" placeholderTextColor={C.text3} />
        <Text style={[m.label, { marginTop: 16 }]}>DESCRIPTION</Text>
        <TextInput style={[m.input, { height: 80 }]} value={desc} onChangeText={setDesc}
          placeholder="Optional…" placeholderTextColor={C.text3} multiline />
        <TouchableOpacity style={[m.btn, (!name.trim() || loading) && { opacity: 0.5 }]}
          onPress={create} disabled={!name.trim() || loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color={C.bg} /> : <Text style={m.btnText}>Create group</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingTop: 12 },
  greeting: { fontSize: 24, fontWeight: '800', color: C.text1 },
  sub: { fontSize: 13, color: C.text2, marginTop: 2 },
  newBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  newBtnText: { color: C.bg, fontWeight: '700', fontSize: 14 },
  cards: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: C.text2, letterSpacing: 1.5, paddingHorizontal: 20, marginBottom: 12 },
  groupList: { paddingHorizontal: 20, gap: 10 },
  groupCard: {
    backgroundColor: C.glass, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  groupAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.accentDim, borderWidth: 1, borderColor: 'rgba(110,231,183,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  groupAvatarText: { color: C.accent, fontWeight: '800', fontSize: 18 },
  groupInfo: { flex: 1 },
  groupName: { color: C.text1, fontWeight: '700', fontSize: 15 },
  groupDesc: { color: C.text2, fontSize: 12, marginTop: 2 },
  groupMeta: { color: C.text3, fontSize: 12, marginTop: 4 },
  chevron: { color: C.text3, fontSize: 22, fontWeight: '300' },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { color: C.text1, fontSize: 18, fontWeight: '700' },
  emptySub: { color: C.text2, fontSize: 14 },
  emptyBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
})

const sc = StyleSheet.create({
  card: { flex: 1, backgroundColor: C.glass, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12 },
  cardLabel: { fontSize: 9, fontWeight: '700', color: C.text2, letterSpacing: 1.2, marginBottom: 6 },
  cardAmount: { fontSize: 16, fontWeight: '800' },
})

const m = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 24, paddingTop: 12 },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '800', color: C.text1 },
  close: { fontSize: 18, color: C.text2, padding: 4 },
  label: { fontSize: 10, fontWeight: '700', color: C.text2, letterSpacing: 1.5, marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: C.border, color: C.text1,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    textAlignVertical: 'top',
  },
  btn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 28 },
  btnText: { color: C.bg, fontWeight: '700', fontSize: 15 },
})
