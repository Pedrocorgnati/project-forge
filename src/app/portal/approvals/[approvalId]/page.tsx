// src/app/portal/approvals/[approvalId]/page.tsx
// module-17-clientportal-approvals / TASK-7 ST006
// Pagina de resposta a aprovacao individual (cliente)
// Rastreabilidade: INT-107

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import dynamic from 'next/dynamic'

const ApprovalResponseForm = dynamic(
  () => import('@/components/approvals/ApprovalResponseForm').then((m) => ({ default: m.ApprovalResponseForm })),
  { loading: () => null, ssr: false },
)
import { ExpiredApprovalPage } from '@/components/approvals/ExpiredApprovalPage'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

export const metadata: Metadata = {
  title: 'Responder Aprovacao — Portal do Cliente',
}

export default async function PortalApprovalDetailPage({
  params,
}: {
  params: Promise<{ approvalId: string }>
}) {
  const { approvalId } = await params

  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)
  if (user.role !== UserRole.CLIENTE) redirect(ROUTES.DASHBOARD)

  // Buscar aprovacao com relacoes
  const approval = await prisma.approvalRequest.findUnique({
    where: { id: approvalId },
    include: {
      project: { select: { name: true } },
      requester: { select: { name: true, email: true } },
      clientAccess: { select: { clientEmail: true } },
    },
  })

  // Se nao encontrou ou nao pertence ao cliente, redirecionar
  if (!approval || approval.clientAccess.clientEmail !== user.email) {
    redirect(ROUTES.PORTAL_APPROVALS_LIST)
  }

  // Se expirada, mostrar pagina de expiracao
  if (approval.status === 'EXPIRED') {
    return (
      <ExpiredApprovalPage
        approvalTitle={approval.title}
        projectName={approval.project.name}
        requesterEmail={approval.requester.email ?? ''}
      />
    )
  }

  // Se ja respondida (APPROVED/REJECTED), redirecionar para lista
  if (approval.status !== 'PENDING') {
    redirect(ROUTES.PORTAL_APPROVALS_LIST)
  }

  return (
    <ApprovalResponseForm
      approvalId={approval.id}
      title={approval.title}
      description={approval.description}
      type={approval.type}
      projectName={approval.project.name}
      requesterName={approval.requester.name ?? 'Equipe'}
      slaDeadline={approval.slaDeadline.toISOString()}
    />
  )
}
