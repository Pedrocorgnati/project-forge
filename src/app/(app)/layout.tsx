'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header
        userName="Usuário"
        onMenuToggle={() => setMobileMenuOpen((v) => !v)}
        isMobileMenuOpen={mobileMenuOpen}
      />
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main
        id="main-content"
        data-testid="main-content"
        className="md:ml-60 pt-16 min-h-screen"
        tabIndex={-1}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
