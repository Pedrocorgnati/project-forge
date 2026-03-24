import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { EstimateDetailClient } from '@/components/estimates/estimate-detail-client'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

interface Props {
  params: Promise<{ id: string; estimateId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { estimateId } = await params
  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId },
    select: { version: true },
  })
  const suffix = estimate ? ` v${estimate.version}` : ''
  return {
    title: `Detalhe da Estimativa${suffix} — Project Forge`,
    description: 'Visualize detalhes, itens e benchmarks da estimativa',
  }
}

export default async function EstimateDetailPage({ params }: Props) {
  const { id, estimateId } = await params
  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)
  if (user.role === UserRole.CLIENTE) redirect(ROUTES.PORTAL)

  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId, projectId: id },
    include: {
      items: { orderBy: { category: 'asc' } },
      versions: {
        orderBy: { version: 'desc' },
        include: { changer: { select: { name: true, avatarUrl: true } } },
      },
    },
  })

  if (!estimate) redirect(`/projects/${id}/estimates`)

  return (
    <EstimateDetailClient
      estimate={estimate}
      projectId={id}
      userRole={user.role}
    />
  )
}
