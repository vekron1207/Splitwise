import { Redirect } from 'expo-router'
import { useAuthStore } from '@/store/auth'

export default function Root() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />
}
