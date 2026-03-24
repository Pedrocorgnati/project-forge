// ─── CHANGE ORDER CARD ────────────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-2 / ST002
// Rastreabilidade: INT-074

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ChangeOrderData } from '@/hooks/use-change-orders'
import { Badge } from '@/components/ui/badge'
import { PermissionGate } from '@/components/auth/PermissionGate'

const ChangeOrderDetail = dynamic(
  () => import('./ChangeOrderDetail').then((m) => ({ default: m.ChangeOrderDetail })),
  { loading: () => null, ssr: false },
)
import { Clock, DollarSign, User, Calendar, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { BadgeVariant } from '@/components/ui/badge'

const STATUS_CONFIG: Record<
  ChangeOrderData['status'],
  { label: string; variant: BadgeVariant }
> = {
  DRAFT:            { label: 'Rascunho',    variant: 'neutral' },
  PENDING_APPROVAL: { label: 'Aguardando', variant: 'warning' },
  APPROVED:         { label: 'Aprovada',   variant: 'success' },
  REJECTED:         { label: 'Rejeitada',  variant: 'error' },
}

interface ChangeOrderCardProps {
  changeOrder: ChangeOrderData
  projectId: string
  userRole: string
  userId: string
  onUpdated: () => void
}

export function ChangeOrderCard({
  changeOrder,
  projectId,
  userRole,
  userId,
  onUpdated,
}: ChangeOrderCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  const statusConfig = STATUS_CONFIG[changeOrder.status]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setShowDetail(true)
    }
  }

  return (
    <>
      <div
        className={cn(
          'rounded-lg border bg-white dark:bg-slate-800 p-4',
          'hover:border-brand dark:hover:border-brand transition-colors cursor-pointer',
          'border-slate-200 dark:border-slate-700',
        )}
        onClick={() => setShowDetail(true)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Abrir detalhes da change order: ${changeOrder.title}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-50 truncate">
                {changeOrder.title}
              </span>
              <Badge
                variant={statusConfig.variant}
                aria-label={`Status: ${statusConfig.label}`}
              >
                {statusConfig.label}
              </Badge>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
              {changeOrder.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <PermissionGate role={['SOCIO', 'PM']}>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  +{changeOrder.impactHours}h
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" aria-hidden="true" />
                  +R${' '}
                  {changeOrder.impactCost.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </PermissionGate>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" aria-hidden="true" />
                {changeOrder.requester?.name ?? changeOrder.creator?.name ?? '—'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                {format(new Date(changeOrder.requestedAt), 'dd/MM/yyyy', {
                  locale: ptBR,
                })}
              </span>
            </div>

            {changeOrder.status === 'APPROVED' && changeOrder.approvedAt && (
              <p className="text-xs text-green-600 dark:text-green-400">
                {changeOrder.approver?.name
                  ? `Aprovada por ${changeOrder.approver.name} em `
                  : 'Aprovada em '}
                {format(new Date(changeOrder.approvedAt), 'dd/MM/yyyy', {
                  locale: ptBR,
                })}
              </p>
            )}

            {changeOrder.status === 'REJECTED' && changeOrder.rejectionReason && (
              <p className="text-xs text-red-500 dark:text-red-400 line-clamp-1">
                Rejeitada: {changeOrder.rejectionReason}
              </p>
            )}
          </div>

          <ChevronRight
            className="h-5 w-5 text-slate-400 shrink-0 mt-1"
            aria-hidden="true"
          />
        </div>
      </div>

      {showDetail && (
        <ChangeOrderDetail
          changeOrderId={changeOrder.id}
          projectId={projectId}
          userRole={userRole}
          userId={userId}
          onClose={() => setShowDetail(false)}
          onUpdated={() => {
            onUpdated()
            setShowDetail(false)
          }}
        />
      )}
    </>
  )
}
