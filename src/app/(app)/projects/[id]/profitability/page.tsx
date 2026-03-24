// ─── PROFITABILITY PAGE ───────────────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-6 / ST007
// Server Component — RBAC: SOCIO/PM only; DEV/CLIENTE são redirecionados

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { ProfitabilityClient } from './profitability-client'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

interface ProfitabilityPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProfitabilityPageProps): Promise<Metadata> {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: { name: true },
  })

  return {
    title: project ? `Rentabilidade — ${project.name}` : 'Rentabilidade',
    description: 'Dashboard de rentabilidade — P&L, burn rate e breakdown de custos por equipe',
  }
}

export default async function ProfitabilityPage({ params }: ProfitabilityPageProps) {
  const { id: projectId } = await params
  const user = await getServerUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  // Verificar acesso ao projeto e obter role efetivo
  let projectRole: UserRole
  try {
    const access = await withProjectAccess(user.id, projectId)
    projectRole = access.projectRole
  } catch {
    redirect(`/projects/${projectId}`)
  }

  // Proteção RBAC — DEV/CLIENTE redirecionados
  if (projectRole !== UserRole.SOCIO && projectRole !== UserRole.PM) {
    redirect(`/projects/${projectId}`)
  }

  return (
    <ProfitabilityClient
      projectId={projectId}
      userRole={projectRole as 'SOCIO' | 'PM'}
    />
  )
}
