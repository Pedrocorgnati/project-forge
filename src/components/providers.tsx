'use client'

import { Toaster } from '@/components/ui/toast'
import { QueryProvider } from '@/providers/query-client'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      {children}
      <Toaster />
    </QueryProvider>
  )
}
