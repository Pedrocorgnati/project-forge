// src/components/portal/invalid-invitation-page.tsx
// module-16-clientportal-auth / TASK-3 ST001 (correção pós-auditoria)
// Página de erro para tokens inválidos/revogados/já usados
// Rastreabilidade: INT-104, GAP-007

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants/routes'

interface InvalidInvitationPageProps {
  reason: string
}

export function InvalidInvitationPage({ reason }: InvalidInvitationPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Convite inválido</h1>
          <p className="text-gray-500 text-sm">{reason || 'Link inválido.'}</p>
        </div>
        <div className="space-y-2">
          <Link href={ROUTES.LOGIN} className="w-full">
            <Button variant="outline" className="w-full">Acessar portal</Button>
          </Link>
          <p className="text-xs text-gray-400">
            Precisa de ajuda? Entre em contato com a equipe que o convidou.
          </p>
        </div>
      </div>
    </div>
  )
}
