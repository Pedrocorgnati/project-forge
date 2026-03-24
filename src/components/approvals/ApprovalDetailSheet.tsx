'use client'

// src/components/approvals/ApprovalDetailSheet.tsx
// module-17-clientportal-approvals / TASK-6 ST005
// Sheet lateral com detalhes da aprovação e timeline de histórico
// Rastreabilidade: INT-107

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
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
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { SLACountdownBadge } from './SlaCountdownBadge'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ApprovalHistoryEntry {
  id: string
  action: string
  comment: string | null
  actorId: string | null
  createdAt: string
}

interface ApprovalDetail {
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
  history: ApprovalHistoryEntry[]
}

interface ApprovalDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  approvalId: string
  projectId: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

export function ApprovalDetailSheet({
  open,
  onOpenChange,
  approvalId,
  projectId,
}: ApprovalDetailSheetProps) {
  const [approval, setApproval] = useState<ApprovalDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/projects/${projectId}/approvals/${approvalId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar detalhes')
        return res.json()
      })
      .then((data: ApprovalDetail) => {
        if (!cancelled) setApproval(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, approvalId, projectId])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 bg-black/30 dark:bg-black/50 z-40',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed right-0 top-0 bottom-0 z-50 w-full max-w-md',
            'bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700',
            'shadow-xl overflow-y-auto',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            'duration-200',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-50 line-clamp-1">
              Detalhes da Aprovação
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Fechar detalhes"
                className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <svg
                  aria-label="Carregando..."
                  className="w-6 h-6 animate-spin text-brand"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {approval && !loading && (
              <div className="space-y-5">
                {/* Title */}
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {approval.title}
                </h2>

                {/* Type + SLA */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="info" className="gap-1">
                    {TYPE_ICONS[approval.type]}
                    {TYPE_LABELS[approval.type] ?? approval.type}
                  </Badge>
                  <SLACountdownBadge
                    slaDeadline={new Date(approval.slaDeadline)}
                    status={approval.status}
                  />
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Descrição</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {approval.description}
                  </p>
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Solicitante</p>
                    <p className="text-slate-700 dark:text-slate-300">
                      {approval.requester.name ?? approval.requester.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Cliente</p>
                    <p className="text-slate-700 dark:text-slate-300">
                      {approval.clientAccess.clientName || approval.clientAccess.clientEmail}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Criado em</p>
                    <p className="text-slate-700 dark:text-slate-300">
                      {format(new Date(approval.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {approval.respondedAt && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Respondido em</p>
                      <p className="text-slate-700 dark:text-slate-300">
                        {format(new Date(approval.respondedAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                {approval.history.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                      Histórico
                    </p>
                    <div className="relative space-y-0">
                      {approval.history.map((entry, index) => (
                        <div
                          key={entry.id}
                          className="flex gap-3 pb-4 last:pb-0"
                        >
                          {/* Timeline line + icon */}
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                              {getActionIcon(entry.action, entry.actorId)}
                            </div>
                            {index < approval.history.length - 1 && (
                              <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pt-1">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {ACTION_LABELS[entry.action] ?? entry.action}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {entry.actorId === null
                                ? 'Sistema (automático)'
                                : approval.requester.name ?? approval.requester.email}
                              {' — '}
                              {format(new Date(entry.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                            {entry.comment && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 italic">
                                {entry.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
