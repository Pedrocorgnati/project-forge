'use client'

// src/app/projects/[id]/approvals/approvals-dashboard.tsx
// module-17-clientportal-approvals / TASK-6 ST006b
// Client component — Tabs com filtro por status + lista de cards
// Rastreabilidade: INT-107

import { useState } from 'react'
import { Download, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { ApprovalRequestCard, type ApprovalData } from '@/components/approvals/ApprovalRequestCard'
import { CreateApprovalButton } from '@/components/approvals/CreateApprovalButton'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActiveClient {
  id: string
  clientEmail: string
  clientName: string
}

interface ApprovalsDashboardProps {
  projectId: string
  approvals: ApprovalData[]
  activeClients: ActiveClient[]
  userRole: string
}

// ─── Tabs config ────────────────────────────────────────────────────────────

type TabKey = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'APPROVED', label: 'Aprovados' },
  { key: 'REJECTED', label: 'Rejeitados' },
  { key: 'EXPIRED', label: 'Expirados' },
]

const EMPTY_MESSAGES: Record<TabKey, { title: string; description: string }> = {
  PENDING: {
    title: 'Nenhuma aprovação pendente',
    description: 'Crie uma nova aprovação para solicitar feedback do cliente.',
  },
  APPROVED: {
    title: 'Nenhuma aprovação aceita',
    description: 'Aprovações aceitas pelo cliente aparecerão aqui.',
  },
  REJECTED: {
    title: 'Nenhuma aprovação rejeitada',
    description: 'Aprovações rejeitadas pelo cliente aparecerão aqui.',
  },
  EXPIRED: {
    title: 'Nenhuma aprovação expirada',
    description: 'Aprovações que passaram do prazo SLA aparecerão aqui.',
  },
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function ApprovalsDashboard({
  projectId,
  approvals,
  activeClients,
  userRole,
}: ApprovalsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('PENDING')

  const countByStatus = (status: TabKey) =>
    approvals.filter((a) => a.status === status).length

  const filteredApprovals = approvals.filter((a) => a.status === activeTab)

  return (
    <div className="space-y-6" data-testid="approvals-dashboard">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-brand" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            Aprovações
          </h1>
          <Badge variant="neutral">{approvals.length} total</Badge>
        </div>

        <div className="flex items-center gap-2">
          <PermissionGate role="SOCIO">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => {
                window.open(`/api/projects/${projectId}/approvals/export`, '_blank')
              }}
              data-testid="export-csv-button"
            >
              Exportar CSV
            </Button>
          </PermissionGate>
          <CreateApprovalButton projectId={projectId} activeClients={activeClients} />
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Filtrar aprovações por status"
        className="flex gap-1 border-b border-slate-200 dark:border-slate-700"
      >
        {TABS.map((tab) => {
          const count = countByStatus(tab.key)
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors',
                'border-b-2 -mb-px',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                isActive
                  ? 'border-brand text-brand dark:text-brand'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300',
              )}
            >
              {tab.label}
              {count > 0 && (
                <Badge
                  variant={isActive ? 'info' : 'neutral'}
                  className="text-[10px] px-1.5 py-0"
                >
                  {count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab panel */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-label={`Aprovações ${TABS.find((t) => t.key === activeTab)?.label}`}
      >
        {filteredApprovals.length === 0 ? (
          <EmptyState
            title={EMPTY_MESSAGES[activeTab].title}
            description={EMPTY_MESSAGES[activeTab].description}
            icon={<ClipboardCheck className="w-full h-full" />}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApprovals.map((approval) => (
              <ApprovalRequestCard
                key={approval.id}
                approval={approval}
                projectId={projectId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
