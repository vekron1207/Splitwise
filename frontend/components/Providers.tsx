'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30_000 },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(13,13,26,0.95)',
            color: '#e8eaf0',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#6ee7b7', secondary: '#07070f' },
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: '#07070f' },
          },
        }}
      />
    </QueryClientProvider>
  )
}
