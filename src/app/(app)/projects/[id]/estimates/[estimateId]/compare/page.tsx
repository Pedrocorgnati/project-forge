import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { EstimateVersionDiff } from '@/components/estimates/estimate-version-diff'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

interface Props {
  params: Promise<{ id: string; estimateId: string }>
  searchParams: Promise<{ with?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Comparação de Estimativas — Project Forge',
    description: 'Compare versões de estimativas lado a lado',
  }
}

export default async function EstimateComparePage({ params, searchParams }: Props) {
  const { id, estimateId } = await params
  const { with: withId } = await searchParams

  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)
  if (user.role === UserRole.CLIENTE) redirect(ROUTES.PORTAL)

  const estimateA = await prisma.estimate.findUnique({
    where: { id: estimateId, projectId: id },
    include: { items: true, versions: { take: 1, orderBy: { version: 'desc' } } },
  })

  const estimateB = withId
    ? await prisma.estimate.findUnique({
        where: { id: withId, projectId: id },
        include: { items: true, versions: { take: 1, orderBy: { version: 'desc' } } },
      })
    : null

  if (!estimateA) redirect(`/projects/${id}/estimates`)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-xl font-bold">
        Comparação de estimativas
        {estimateB && ` — v${estimateA.version} vs v${estimateB.version}`}
      </h1>
      <EstimateVersionDiff
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        estimateA={estimateA as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        estimateB={estimateB as any}
      />
    </div>
  )
}
