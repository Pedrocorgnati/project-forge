// src/app/(app)/projects/[id]/settings/costs/page.tsx
// Server Component — Cost Config & P&L Preview (module-14-rentabilia-timesheet / TASK-6)
// Acesso restrito a SOCIO

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { PLPreview } from '@/components/cost-config/PLPreview'
import { RateConfigTable } from '@/components/cost-config/RateConfigTable'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

interface CostsPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CostsPageProps): Promise<Metadata> {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: { name: true },
  })

  return {
    title: project ? `Custos e Rentabilidade — ${project.name}` : 'Custos e Rentabilidade',
    description: 'Configure tarifas por perfil e visualize a projecao de P&L do projeto',
  }
}

export default async function CostsPage({ params }: CostsPageProps) {
  const { id: projectId } = await params
  const user = await getServerUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  // Verificar acesso ao projeto
  let projectRole: string
  try {
    const access = await withProjectAccess(user.id, projectId)
    projectRole = access.projectRole ?? user.role
  } catch {
    redirect(ROUTES.PROJECTS)
  }

  // Apenas SOCIO pode acessar esta pagina
  if (projectRole !== UserRole.SOCIO) {
    redirect(`/projetos/${projectId}`)
  }

  // Verificar se o projeto existe
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  })

  if (!project) {
    redirect(ROUTES.PROJECTS)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Custos e Rentabilidade
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure tarifas por perfil e acompanhe a projecao de margem de {project.name}
        </p>
      </div>

      <PLPreview projectId={projectId} />

      <RateConfigTable projectId={projectId} />
    </div>
  )
}
