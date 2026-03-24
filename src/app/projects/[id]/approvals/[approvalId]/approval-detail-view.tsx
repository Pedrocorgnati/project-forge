'use client'

// src/app/projects/[id]/approvals/[approvalId]/approval-detail-view.tsx
// module-17-clientportal-approvals / TASK-6 ST007b
// Client component — Renderiza detalhes completos + timeline de histórico
// Rastreabilidade: INT-107

import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bot,
  FileText,
  CheckSquare,
  Package,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SLACountdownBadge } from '@/components/approvals/SlaCountdownBadge'

// ─── Types ──────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string
  action: string
  comment: string | null
  actorId: string | null
  actorName: string | null
  createdAt: string
}

interface ApprovalViewData {
  id: string
  projectId: string
  type: string
  title: string
  description: string
  status: string
  slaDeadline: string
  respondedAt: string | null
  createdAt: string
  requester: { name: string | null; email: string }
  clientAccess: { clientEmail: string; clientName: string }
  history: HistoryEntry[]
}

interface ApprovalDetailViewProps {
  approval: ApprovalViewData
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  DOCUMENT: <FileText className="w-5 h-5" />,
  MILESTONE: <CheckSquare className="w-5 h-5" />,
  DELIVERABLE: <Package className="w-5 h-5" />,
}

const TYPE_LABELS: Record<string, string> = {
  DOCUMENT: 'Documento',
  MILESTONE: 'Milestone',
  DELIVERABLE: 'Entregável',
}

function getActionIcon(action: string, actorId: string | null) {
  if (actorId === null) {
    return <Bot className="w-4 h-4 text-slate-400" />
  }
  switch (action) {
    case 'CREATED':
      return <Clock className="w-4 h-4 text-blue-500" />
    case 'APPROVED':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'REJECTED':
      return <XCircle className="w-4 h-4 text-red-500" />
    case 'EXPIRED':
      return <AlertCircle className="w-4 h-4 text-slate-400" />
    case 'REMINDER_SENT':
      return <Clock className="w-4 h-4 text-amber-500" />
    case 'CANCELLED':
      return <XCircle className="w-4 h-4 text-slate-400" />
    default:
      return <Clock className="w-4 h-4 text-slate-400" />
  }
}

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Criado',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  EXPIRED: 'Expirado',
  REMINDER_SENT: 'Lembrete enviado',
  CANCELLED: 'Cancelado',
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function ApprovalDetailView({ approval }: ApprovalDetailViewProps) {
  return (
    <div className="space-y-6" data-testid="approval-detail-view">
      {/* Main info card */}
      <Card>
        <CardContent className="space-y-5 pt-6">
          {/* Title + Type + SLA */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-light dark:bg-brand/20 text-brand">
                {TYPE_ICONS[approval.type] ?? <FileText className="w-5 h-5" />}
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  {approval.title}
                </h1>
                <Badge variant="info" className="mt-1">
                  {TYPE_LABELS[approval.type] ?? approval.type}
                </Badge>
              </div>
            </div>
            <SLACountdownBadge
              slaDeadline={new Date(approval.slaDeadline)}
              status={approval.status}
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Descrição</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {approval.description}
            </p>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Solicitante</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {approval.requester.name ?? approval.requester.email}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Cliente</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {approval.clientAccess.clientName || approval.clientAccess.clientEmail}
              </p>
              <p className="text-xs text-slate-400">{approval.clientAccess.clientEmail}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Criado em</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {format(new Date(approval.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            {approval.respondedAt && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Respondido em</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {format(new Date(approval.respondedAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History timeline card */}
      {approval.history.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">
              Histórico de Atividades
            </h2>

            <div className="relative space-y-0">
              {approval.history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex gap-3 pb-5 last:pb-0"
                >
                  {/* Timeline column */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                      {getActionIcon(entry.action, entry.actorId)}
                    </div>
                    {index < approval.history.length - 1 && (
                      <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </p>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {format(new Date(entry.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {entry.actorId === null ? (
                        <span className="inline-flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          Sistema (automático)
                        </span>
                      ) : (
                        entry.actorName ?? 'Usuário desconhecido'
                      )}
                    </p>
                    {entry.comment && (
                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-md px-3 py-2 italic">
                        &ldquo;{entry.comment}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
