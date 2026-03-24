import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { EstimateListClient } from '@/components/estimates/estimate-list-client'
import { GenerateEstimateButton } from '@/components/estimates/generate-estimate-button'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Estimativas — Project Forge',
    description: 'Visualize e gerencie estimativas do projeto',
  }
}

export default async function EstimatesPage({ params }: Props) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)

  // CLIENTE não acessa esta página
  if (user.role === UserRole.CLIENTE) redirect(ROUTES.PORTAL)

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, status: true },
  })
  if (!project) redirect(ROUTES.DASHBOARD)

  const estimates = await prisma.estimate.findMany({
    where: { projectId: id },
    orderBy: { version: 'desc' },
    include: { _count: { select: { items: true } } },
  })

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estimativas</h1>
          <p className="text-muted-foreground">Projeto: {project.name}</p>
        </div>
        <PermissionGate role={['SOCIO', 'PM']}>
          <GenerateEstimateButton projectId={id} />
        </PermissionGate>
      </div>

      <EstimateListClient
        initialEstimates={estimates}
        projectId={id}
        userRole={user.role}
      />
    </div>
  )
}
