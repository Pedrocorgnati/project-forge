// src/components/portal/portal-header.tsx
// module-16-clientportal-auth / TASK-3 ST005 (correção pós-auditoria)
// Header simplificado do portal do cliente (sem sidebar interna)
// Rastreabilidade: INT-104, GAP-008

'use client'

import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toast'
import { LogOut } from 'lucide-react'
import { ROUTES } from '@/lib/constants/routes'

interface PortalHeaderProps {
  userName: string
}

export function PortalHeader({ userName }: PortalHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      await supabase.auth.signOut()
      router.push(ROUTES.LOGIN)
    } catch {
      toast.error('Erro ao sair', { description: 'Tente novamente' })
    }
  }

  return (
    <header className="border-b bg-white">
      <a href="#main-content" className="skip-nav">
        Pular para o conteúdo principal
      </a>
      <div className="container mx-auto max-w-4xl flex items-center justify-between px-4 py-3">
        <span className="font-semibold text-gray-900">ProjectForge — Portal</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{userName}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" aria-hidden="true" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  )
}
