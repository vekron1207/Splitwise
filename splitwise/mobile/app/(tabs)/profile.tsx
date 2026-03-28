import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/auth'
import { C } from '@/constants/colors'

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive', onPress: async () => {
          await logout()
          router.replace('/(auth)/login')
        }
      },
    ])
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.pageTitle}>Profile</Text>

        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.name}>{user?.name}</Text>
          <Text style={s.email}>{user?.email}</Text>
        </View>

        {/* Info card */}
        <View style={s.card}>
          <Row label="Name" value={user?.name ?? ''} />
          <View style={s.divider} />
          <Row label="Email" value={user?.email ?? ''} />
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={s.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={r.row}>
      <Text style={r.label}>{label}</Text>
      <Text style={r.value}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, padding: 20 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: C.text1, marginBottom: 32 },
  avatarWrap: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: C.bg, fontSize: 28, fontWeight: '800' },
  name: { color: C.text1, fontSize: 20, fontWeight: '700' },
  email: { color: C.text2, fontSize: 14, marginTop: 4 },
  card: {
    backgroundColor: C.glass, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 24,
  },
  divider: { height: 1, backgroundColor: C.border },
  logoutBtn: {
    borderRadius: 12, paddingVertical: 15, alignItems: 'center',
    backgroundColor: C.dangerDim, borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)',
  },
  logoutText: { color: C.danger, fontWeight: '700', fontSize: 15 },
})

const r = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  label: { fontSize: 13, color: C.text2 },
  value: { fontSize: 13, color: C.text1, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
})
