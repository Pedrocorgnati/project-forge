// src/app/projects/[id]/approvals/page.tsx
// module-17-clientportal-approvals / TASK-6 ST006
// Server Component — Dashboard interno de aprovações (SOCIO/PM)
// Rastreabilidade: INT-107

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { ApprovalsDashboard } from './approvals-dashboard'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

export const metadata: Metadata = {
  title: 'Aprovações — ProjectForge',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ApprovalsPage({ params }: PageProps) {
  const { id: projectId } = await params
  const user = await getServerUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  if (user.role !== UserRole.SOCIO && user.role !== UserRole.PM) {
    redirect(ROUTES.DASHBOARD)
  }

  // Carregar todas as aprovações do projeto
  const approvals = await prisma.approvalRequest.findMany({
    where: { projectId },
    include: {
      requester: { select: { name: true, email: true } },
      clientAccess: { select: { clientEmail: true, clientName: true } },
      history: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Carregar clientes ativos para o modal de criação
  const activeClients = await prisma.clientAccess.findMany({
    where: { projectId, status: 'ACTIVE' },
    select: { id: true, clientEmail: true, clientName: true },
    orderBy: { clientName: 'asc' },
  })

  // Serializar datas para JSON (Server → Client handoff)
  const serializedApprovals = approvals.map((a: { id: string; projectId: string; clientAccessId: string; requestedBy: string; type: string; title: string; description: string | null; status: string; slaDeadline: Date; respondedAt?: Date | null; createdAt: Date; updatedAt: Date; requester: unknown; clientAccess: unknown; history: Array<{ id: string; action: string; comment: string | null; actorId: string | null; createdAt: Date }> }) => ({
    id: a.id,
    projectId: a.projectId,
    clientAccessId: a.clientAccessId,
    requestedBy: a.requestedBy,
    type: a.type,
    title: a.title,
    description: a.description,
    status: a.status,
    slaDeadline: a.slaDeadline.toISOString(),
    respondedAt: a.respondedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    requester: a.requester,
    clientAccess: a.clientAccess,
    history: a.history.map((h: { id: string; action: string; comment: string | null; actorId: string | null; createdAt: Date }) => ({
      id: h.id,
      action: h.action,
      comment: h.comment,
      actorId: h.actorId,
      createdAt: h.createdAt.toISOString(),
    })),
  }))

  return (
    <ApprovalsDashboard
      projectId={projectId}
      approvals={serializedApprovals}
      activeClients={activeClients}
      userRole={user.role}
    />
  )
}
