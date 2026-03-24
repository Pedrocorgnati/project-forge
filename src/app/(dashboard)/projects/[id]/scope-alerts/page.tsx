// ─── SCOPE ALERTS PAGE ────────────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-3
// Rastreabilidade: INT-069

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { ScopeAlertList } from '@/components/scope-alerts/ScopeAlertList'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

interface ScopeAlertsPageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Alertas de Escopo | ProjectForge',
  description: 'Visualize e gerencie alertas de escopo do projeto',
}

export default async function ScopeAlertsPage({ params }: ScopeAlertsPageProps) {
  const { id: projectId } = await params
  const user = await getServerUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  let projectRole: string
  try {
    const access = await withProjectAccess(user.id, projectId)
    projectRole = access.projectRole ?? user.role
  } catch {
    redirect(`/projects/${projectId}`)
  }

  // CLIENTE não tem acesso à tela de alertas
  if (projectRole === UserRole.CLIENTE) {
    redirect(`/projects/${projectId}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Alertas de Escopo
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie alertas de validação de escopo identificados pela IA
        </p>
      </div>

      <ScopeAlertList projectId={projectId} userRole={projectRole} />
    </div>
  )
}
