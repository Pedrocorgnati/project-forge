// src/app/projects/[id]/approvals/[approvalId]/page.tsx
// module-17-clientportal-approvals / TASK-6 ST007
// Server Component — Página de detalhe da aprovação (SOCIO/PM)
// Rastreabilidade: INT-107

import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { ApprovalDetailView } from './approval-detail-view'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

interface PageProps {
  params: Promise<{ id: string; approvalId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { approvalId } = await params
  const approval = await prisma.approvalRequest.findUnique({
    where: { id: approvalId },
    select: { title: true },
  })

  return {
    title: approval
      ? `${approval.title} — Aprovações — ProjectForge`
      : 'Aprovação — ProjectForge',
  }
}

export default async function ApprovalDetailPage({ params }: PageProps) {
  const { id: projectId, approvalId } = await params
  const user = await getServerUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  if (user.role !== UserRole.SOCIO && user.role !== UserRole.PM) {
    redirect(ROUTES.DASHBOARD)
  }

  const approval = await prisma.approvalRequest.findUnique({
    where: { id: approvalId, projectId },
    include: {
      requester: { select: { name: true, email: true } },
      clientAccess: { select: { clientEmail: true, clientName: true } },
      history: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!approval) {
    notFound()
  }

  // Resolver emails dos atores no histórico
  const actorIds = approval.history
    .map((h: { actorId: string | null }) => h.actorId)
    .filter((id: string | null): id is string => id !== null)

  const actors =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : []

  const actorMap = new Map<string, { name: string; email: string }>(
    actors.map((a: { id: string; name: string; email: string }) => [a.id, { name: a.name, email: a.email }] as [string, { name: string; email: string }])
  )

  // Serializar para JSON
  const serializedApproval = {
    id: approval.id,
    projectId: approval.projectId,
    type: approval.type,
    title: approval.title,
    description: approval.description,
    status: approval.status,
    slaDeadline: approval.slaDeadline.toISOString(),
    respondedAt: approval.respondedAt?.toISOString() ?? null,
    createdAt: approval.createdAt.toISOString(),
    requester: approval.requester,
    clientAccess: approval.clientAccess,
    history: approval.history.map((h: { id: string; action: string; comment: string | null; actorId: string | null; createdAt: Date }) => {
      const actor = h.actorId ? actorMap.get(h.actorId) : null
      return {
        id: h.id,
        action: h.action,
        comment: h.comment,
        actorId: h.actorId,
        actorName: actor?.name ?? actor?.email ?? null,
        createdAt: h.createdAt.toISOString(),
      }
    }),
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${projectId}/approvals`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para aprovações
        </Link>

        {user.role === UserRole.SOCIO && (
          <a
            href={`/api/projects/${projectId}/approvals/export`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-brand text-brand hover:bg-brand-light dark:hover:bg-brand/20 transition-colors"
            data-testid="detail-export-csv-button"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </a>
        )}
      </div>

      <ApprovalDetailView approval={serializedApproval} />
    </div>
  )
}
