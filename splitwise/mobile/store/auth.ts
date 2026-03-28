import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface UserInfo {
  userId: number
  name: string
  email: string
}

interface AuthState {
  token: string | null
  user: UserInfo | null
  isAuthenticated: boolean
  login: (token: string, user: UserInfo) => Promise<void>
  logout: () => Promise<void>
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: async (token, user) => {
    await AsyncStorage.setItem('token', token)
    await AsyncStorage.setItem('user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['token', 'user'])
    set({ token: null, user: null, isAuthenticated: false })
  },

  init: async () => {
    const token = await AsyncStorage.getItem('token')
    const userStr = await AsyncStorage.getItem('user')
    if (token && userStr) {
      set({ token, user: JSON.parse(userStr), isAuthenticated: true })
    }
  },
}))
