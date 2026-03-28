'use client'
import { create } from 'zustand'

type Theme = 'dark' | 'light' | 'system'

interface ThemeStore {
  theme: Theme
  setTheme: (t: Theme) => void
  init: () => void
}

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.add(prefersDark ? 'dark' : 'light')
  } else {
    root.classList.add(theme)
  }
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'dark',

  init: () => {
    if (typeof window === 'undefined') return
    const saved = (localStorage.getItem('theme') as Theme) || 'dark'
    applyTheme(saved)
    set({ theme: saved })

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const current = (localStorage.getItem('theme') as Theme) || 'dark'
      if (current === 'system') applyTheme('system')
    })
  },

  setTheme: (theme: Theme) => {
    localStorage.setItem('theme', theme)
    applyTheme(theme)
    set({ theme })
  },
}))
