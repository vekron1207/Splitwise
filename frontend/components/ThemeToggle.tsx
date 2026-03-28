'use client'
import { useEffect, useState } from 'react'
import { useThemeStore } from '@/store/theme'
import { Sun, Moon, Monitor } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, setTheme, init } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    init()
    setMounted(true)
  }, [init])

  if (!mounted) return null

  const options = [
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'light', icon: Sun, label: 'Navy' },
    { value: 'system', icon: Monitor, label: 'System' },
  ] as const

  return (
    <div className="flex items-center rounded-xl p-1 gap-0.5"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className="p-1.5 rounded-lg transition-all"
          style={{
            background: theme === value ? 'rgba(110,231,183,0.15)' : 'transparent',
            color: theme === value ? '#6ee7b7' : '#8b90a0',
          }}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  )
}
