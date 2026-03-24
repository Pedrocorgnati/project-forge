'use client'

// src/components/approvals/ApprovalRequestCard.tsx
// module-17-clientportal-approvals / TASK-6 ST002
// Card de aprovação com tipo, SLA, cliente e abertura do sheet de detalhes
// Rastreabilidade: INT-107

import { useState } from 'react'
import { FileText, CheckSquare, Package } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SLACountdownBadge } from './SlaCountdownBadge'
import { ApprovalDetailSheet } from './ApprovalDetailSheet'

interface ApprovalRequester {
  name: string | null
  email: string
}

interface ApprovalClientAccess {
  clientEmail: string
  clientName: string
}

interface ApprovalHistoryEntry {
  id: string
  action: string
  comment: string | null
  actorId: string | null
  createdAt: string
}

export interface ApprovalData {
  id: string
  projectId: string
  clientAccessId: string
  requestedBy: string
  type: string
  title: string
  description: string
  status: string
  slaDeadline: string
  respondedAt: string | null
  createdAt: string
  updatedAt: string
  requester: ApprovalRequester
  clientAccess: ApprovalClientAccess
  history: ApprovalHistoryEntry[]
}

interface ApprovalRequestCardProps {
  approval: ApprovalData
  projectId: string
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  DOCUMENT: <FileText className="w-4 h-4" />,
  MILESTONE: <CheckSquare className="w-4 h-4" />,
  DELIVERABLE: <Package className="w-4 h-4" />,
}

const TYPE_LABELS: Record<string, string> = {
  DOCUMENT: 'Documento',
  MILESTONE: 'Milestone',
  DELIVERABLE: 'Entregável',
}

export function ApprovalRequestCard({ approval, projectId }: ApprovalRequestCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const typeIcon = TYPE_ICONS[approval.type] ?? <FileText className="w-4 h-4" />
  const typeLabel = TYPE_LABELS[approval.type] ?? approval.type

  return (
    <>
      <Card
        variant="interactive"
        onClick={() => setSheetOpen(true)}
        className="w-full"
      >
        <CardContent className="flex flex-col gap-3">
          {/* Header row: type badge + SLA */}
          <div className="flex items-center justify-between">
            <Badge variant="info" className="gap-1">
              {typeIcon}
              {typeLabel}
            </Badge>
            <SLACountdownBadge
              slaDeadline={new Date(approval.slaDeadline)}
              status={approval.status}
            />
          </div>

          {/* Title */}
          <h3
            className="text-sm font-semibold text-slate-900 dark:text-slate-50 line-clamp-1"
            data-testid="approval-card-title"
          >
            {approval.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {approval.description}
          </p>

          {/* Footer row: client + requester + date */}
          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700">
            <span className="truncate max-w-[45%]" title={approval.clientAccess.clientEmail}>
              {approval.clientAccess.clientName || approval.clientAccess.clientEmail}
            </span>
            <span className="truncate max-w-[30%]" title={approval.requester.name ?? approval.requester.email}>
              {approval.requester.name ?? 'Sem nome'}
            </span>
            <time dateTime={approval.createdAt}>
              {format(new Date(approval.createdAt), "dd MMM yyyy", { locale: ptBR })}
            </time>
          </div>
        </CardContent>
      </Card>

      <ApprovalDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        approvalId={approval.id}
        projectId={projectId}
      />
    </>
  )
}
