/**
 * Route Group: (app)
 *
 * Responsabilidade: Layout visual completo (Sidebar + Header + SessionTimeout).
 * NÃO aplica restrição de role — use o route group (dashboard) para rotas que
 * requerem bloqueio de CLIENTE ou de outros roles específicos.
 *
 * Rotas incluídas: board, briefforge, configuracoes, dashboard, estimai,
 * handoffai, notificacoes, perfil, portal, projects, projetos, rentabilia, scopeshield.
 */
'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { useSessionTimeout } from '@/lib/hooks/use-session-timeout'
import { SessionTimeoutModal } from '@/components/auth/SessionTimeoutModal'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isExpired } = useSessionTimeout(30 * 60 * 1000)

  return (
    <div className="min-h-screen">
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
      <SessionTimeoutModal open={isExpired} />
    </div>
  )
}
