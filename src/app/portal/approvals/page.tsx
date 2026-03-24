// src/app/portal/approvals/page.tsx
// module-17-clientportal-approvals / TASK-7 ST005
// Lista de aprovacoes do cliente com abas por status
// Rastreabilidade: INT-107

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { ClientApprovalCard } from '@/components/approvals/ClientApprovalCard'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

export const metadata: Metadata = {
  title: 'Aprovações — Portal do Cliente',
}

type TabKey = 'pending' | 'responded' | 'expired'

export default async function PortalApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)
  if (user.role !== UserRole.CLIENTE) redirect(ROUTES.DASHBOARD)

  const { tab: rawTab } = await searchParams
  const activeTab: TabKey =
    rawTab === 'responded' || rawTab === 'expired' ? rawTab : 'pending'

  // Buscar todos os acessos ativos do cliente
  const clientAccesses = await prisma.clientAccess.findMany({
    where: { clientEmail: user.email, status: 'ACTIVE' },
    select: { id: true },
  })

  const accessIds = clientAccesses.map((a: { id: string }) => a.id)

  if (accessIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Aprovações</h1>
        <EmptyState
          title="Sem aprovações"
          description="Você não possui acesso a nenhum projeto no momento."
          icon={<ClipboardList className="h-full w-full" />}
        />
      </div>
    )
  }

  // Buscar todas as aprovacoes vinculadas aos acessos do cliente
  const allApprovals = await prisma.approvalRequest.findMany({
    where: { clientAccessId: { in: accessIds } },
    include: {
      project: { select: { name: true } },
      requester: { select: { name: true, email: true } },
      history: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: [{ createdAt: 'desc' }],
  })

  // Classificar por status
  type ApprovalItem = { status: string; slaDeadline: Date; respondedAt?: Date | null; createdAt: Date }
  const pending = allApprovals
    .filter((a: ApprovalItem) => a.status === 'PENDING')
    .sort(
      (a: ApprovalItem, b: ApprovalItem) =>
        new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime()
    )

  const responded = allApprovals
    .filter((a: ApprovalItem) => a.status === 'APPROVED' || a.status === 'REJECTED')
    .sort(
      (a: ApprovalItem, b: ApprovalItem) =>
        new Date(b.respondedAt ?? b.createdAt).getTime() -
        new Date(a.respondedAt ?? a.createdAt).getTime()
    )

  const expired = allApprovals
    .filter((a: ApprovalItem) => a.status === 'EXPIRED')
    .sort(
      (a: ApprovalItem, b: ApprovalItem) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'pending', label: 'Aguardando resposta', count: pending.length },
    { key: 'responded', label: 'Respondidas', count: responded.length },
    { key: 'expired', label: 'Expiradas', count: expired.length },
  ]

  const currentList =
    activeTab === 'pending'
      ? pending
      : activeTab === 'responded'
        ? responded
        : expired

  const emptyMessages: Record<TabKey, { title: string; description: string }> = {
    pending: {
      title: 'Nenhuma aprovação pendente',
      description: 'Você está em dia! Nenhuma aprovação aguardando sua resposta.',
    },
    responded: {
      title: 'Nenhuma aprovação respondida',
      description: 'Você ainda não respondeu nenhuma aprovação.',
    },
    expired: {
      title: 'Nenhuma aprovação expirada',
      description: 'Nenhuma aprovação ultrapassou o prazo de resposta.',
    },
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Aprovações</h1>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-slate-200 dark:border-slate-700" role="tablist">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`/portal/approvals?tab=${t.key}`}
            role="tab"
            aria-selected={activeTab === t.key}
            className={
              activeTab === t.key
                ? 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-brand text-brand dark:text-brand -mb-px'
                : 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 -mb-px border-b-2 border-transparent'
            }
          >
            {t.label}
            {t.count > 0 && (
              <Badge
                variant={t.key === 'pending' && t.count > 0 ? 'warning' : 'neutral'}
                className="text-[10px] px-1.5 py-0"
              >
                {t.count}
              </Badge>
            )}
          </a>
        ))}
      </nav>

      {/* Content */}
      {currentList.length === 0 ? (
        <EmptyState
          title={emptyMessages[activeTab].title}
          description={emptyMessages[activeTab].description}
          icon={<ClipboardList className="h-full w-full" />}
        />
      ) : (
        <div className="space-y-4">
          {currentList.map((approval: { id: string; type: string; title: string; description: string | null; status: string; slaDeadline: Date; respondedAt?: Date | null; createdAt: Date; project: { name: string }; requester: { name: string; email: string } }) => (
            <ClientApprovalCard
              key={approval.id}
              approval={{
                id: approval.id,
                type: approval.type,
                title: approval.title,
                description: approval.description ?? '',
                status: approval.status,
                slaDeadline: approval.slaDeadline.toISOString(),
                respondedAt: approval.respondedAt?.toISOString() ?? null,
                createdAt: approval.createdAt.toISOString(),
                project: approval.project,
                requester: approval.requester,
              }}
              showRespondButton={activeTab === 'pending'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
