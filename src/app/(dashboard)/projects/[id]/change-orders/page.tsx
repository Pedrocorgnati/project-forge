// ─── CHANGE ORDERS PAGE ───────────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-2 / ST001
// Rastreabilidade: INT-074

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { ChangeOrderList } from '@/components/change-orders/ChangeOrderList'
import { ROUTES } from '@/lib/constants/routes'

interface ChangeOrdersPageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Change Orders | ProjectForge',
  description: 'Solicitações de mudança de escopo com impacto no projeto',
}

export default async function ChangeOrdersPage({ params }: ChangeOrdersPageProps) {
  const { id: projectId } = await params
  const user = await getServerUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  let projectRole: string
  try {
    const access = await withProjectAccess(user.id, projectId)
    projectRole = access.projectRole
  } catch {
    redirect(`/projects/${projectId}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Change Orders
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Solicitações de mudança de escopo com impacto no projeto
        </p>
      </div>

      <ChangeOrderList
        projectId={projectId}
        userRole={projectRole}
        userId={user.id}
      />
    </div>
  )
}
