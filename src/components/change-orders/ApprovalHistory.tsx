// ─── APPROVAL HISTORY ─────────────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-2 / ST004
// Timeline do histórico de decisões de uma Change Order
// Rastreabilidade: INT-074

import { ChangeOrderData } from '@/hooks/use-change-orders'
import { CheckCircle, XCircle, Clock, FileEdit } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TimelineItem {
  date: string
  label: string
  icon: React.ElementType
  color: string
}

interface ApprovalHistoryProps {
  changeOrder: ChangeOrderData
}

export function ApprovalHistory({ changeOrder: co }: ApprovalHistoryProps) {
  const creatorName = co.requester?.name ?? co.creator?.name ?? 'Desconhecido'
  const requestedAt = co.requestedAt ?? co.createdAt ?? new Date().toISOString()

  const timeline: TimelineItem[] = [
    {
      date: requestedAt,
      label: `Criado por ${creatorName}`,
      icon: FileEdit,
      color: 'text-blue-500',
    },
    ...(co.status !== 'DRAFT'
      ? [
          {
            date: requestedAt,
            label: 'Submetido para aprovação',
            icon: Clock,
            color: 'text-amber-500',
          },
        ]
      : []),
    ...(co.approvedAt
      ? [
          {
            date: co.approvedAt,
            label: co.approver?.name
              ? `Aprovado por ${co.approver.name}`
              : 'Aprovado',
            icon: CheckCircle,
            color: 'text-green-500',
          },
        ]
      : []),
    ...(co.rejectedAt
      ? [
          {
            date: co.rejectedAt,
            label: co.rejector?.name
              ? `Rejeitado por ${co.rejector.name}${co.rejectionReason ? `: "${co.rejectionReason}"` : ''}`
              : `Rejeitado${co.rejectionReason ? `: "${co.rejectionReason}"` : ''}`,
            icon: XCircle,
            color: 'text-red-500',
          },
        ]
      : []),
  ]

  return (
    <div>
      <p
        className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3"
        id="approval-history-label"
      >
        Histórico
      </p>
      <ol
        className="space-y-3"
        aria-labelledby="approval-history-label"
      >
        {timeline.map((item, i) => {
          const Icon = item.icon
          return (
            <li key={i} className="flex items-start gap-2 text-xs">
              <Icon
                className={`h-4 w-4 mt-0.5 shrink-0 ${item.color}`}
                aria-hidden="true"
              />
              <div>
                <p className="text-slate-700 dark:text-slate-300">{item.label}</p>
                <p className="text-slate-400 dark:text-slate-500">
                  {format(new Date(item.date), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
