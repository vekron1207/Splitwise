import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { router, Link } from 'expo-router'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { C } from '@/constants/colors'

export default function LoginScreen() {
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email.trim() || !password) { Alert.alert('Error', 'Enter email and password'); return }
    setLoading(true)
    try {
      const res = await authApi.login({ email: email.trim(), password })
      const { token, userId, name, email: userEmail } = res.data
      await login(token, { userId, name, email: userEmail })
      router.replace('/(tabs)')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      Alert.alert('Login failed', msg || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoBox}>
            <Text style={s.logoIcon}>⚡</Text>
          </View>
          <Text style={s.logoText}>Split<Text style={{ color: C.accent }}>wise</Text></Text>
          <Text style={s.logoSub}>Sign in to your account</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.label}>EMAIL</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={C.text3}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[s.label, { marginTop: 16 }]}>PASSWORD</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={C.text3}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={C.bg} />
              : <Text style={s.btnText}>Sign in</Text>}
          </TouchableOpacity>

          <View style={s.row}>
            <Text style={s.muted}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity><Text style={{ color: C.accent, fontSize: 14 }}>Sign up</Text></TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: C.accentDim, borderWidth: 1, borderColor: 'rgba(110,231,183,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoIcon: { fontSize: 28 },
  logoText: { fontSize: 28, fontWeight: '800', color: C.text1, letterSpacing: -0.5 },
  logoSub: { fontSize: 14, color: C.text2, marginTop: 4 },
  card: {
    backgroundColor: C.glass, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, padding: 24,
  },
  label: { fontSize: 10, fontWeight: '700', color: C.text2, letterSpacing: 1.5, marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: C.border, color: C.text1,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
  },
  btn: {
    backgroundColor: C.accent, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: C.bg, fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  muted: { color: C.text2, fontSize: 14 },
})
