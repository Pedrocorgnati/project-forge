// ─── CHANGE ORDER DETAIL ──────────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-2 / ST004
// Sheet lateral com detalhes completos, histórico e botões de ação
// Rastreabilidade: INT-074

'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ChangeOrderData } from '@/hooks/use-change-orders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/skeleton'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { RejectionModal } from './RejectionModal'
import { ApprovalHistory } from './ApprovalHistory'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Send,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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

interface ChangeOrderDetailProps {
  changeOrderId: string
  projectId: string
  userRole: string
  userId: string
  onClose: () => void
  onUpdated: () => void
}

export function ChangeOrderDetail({
  changeOrderId,
  projectId,
  userRole,
  userId,
  onClose,
  onUpdated,
}: ChangeOrderDetailProps) {
  const [co, setCo] = useState<ChangeOrderData | null>(null)
  const [fetching, setFetching] = useState(true)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setFetching(true)
    fetch(`/api/projects/${projectId}/change-orders/${changeOrderId}`)
      .then(r => {
        if (r.ok) return r.json()
        return null
      })
      .then(data => {
        if (data) setCo(data)
      })
      .catch(() => {
        toast.error('Erro ao carregar detalhes da change order')
      })
      .finally(() => setFetching(false))
  }, [changeOrderId, projectId])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/change-orders/${changeOrderId}/submit`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' } },
      )
      if (res.ok) {
        toast.success('Change Order submetida para aprovação')
        onUpdated()
      } else {
        const err = await res.json()
        toast.error(err.error ?? 'Erro ao submeter change order')
      }
    } catch {
      toast.error('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/change-orders/${changeOrderId}/approve`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' } },
      )
      if (res.ok) {
        toast.success('Change Order aprovada')
        onUpdated()
      } else {
        const err = await res.json()
        toast.error(err.error ?? 'Erro ao aprovar change order')
      }
    } catch {
      toast.error('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const statusConfig = co ? STATUS_CONFIG[co.status] : null

  return (
    <>
      <Dialog.Root open onOpenChange={open => !open && onClose()}>
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
              'fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg',
              'bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700',
              'shadow-xl overflow-y-auto',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
              'duration-200',
            )}
            aria-describedby="co-detail-description"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex-1 min-w-0">
                <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-50 line-clamp-2">
                  {co?.title ?? 'Carregando...'}
                </Dialog.Title>
                {statusConfig && co && (
                  <Badge variant={statusConfig.variant} className="mt-1">
                    {statusConfig.label}
                  </Badge>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  aria-label="Fechar detalhes da change order"
                  className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              {fetching ? (
                <LoadingSpinner centered label="Carregando detalhes..." />
              ) : !co ? (
                <p className="text-sm text-red-500">
                  Erro ao carregar detalhes. Feche e tente novamente.
                </p>
              ) : (
                <div className="space-y-5" id="co-detail-description">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {co.description}
                  </p>

                  {/* Impacto financeiro — apenas PM/SOCIO */}
                  <PermissionGate role={['SOCIO', 'PM']}>
                    <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock
                          className="h-4 w-4 text-slate-400"
                          aria-hidden="true"
                        />
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          +{co.impactHours}h
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign
                          className="h-4 w-4 text-slate-400"
                          aria-hidden="true"
                        />
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          +R${' '}
                          {co.impactCost.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </PermissionGate>

                  {/* Tasks afetadas */}
                  {co.affectedTaskIds.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                        Tasks Afetadas ({co.affectedTaskIds.length})
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {co.affectedTaskIds.length} task
                        {co.affectedTaskIds.length > 1 ? 's' : ''} vinculada
                        {co.affectedTaskIds.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  {/* Datas */}
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    <p>
                      Criado em{' '}
                      {format(
                        new Date(co.requestedAt ?? co.createdAt ?? new Date()),
                        "dd/MM/yyyy 'às' HH:mm",
                        { locale: ptBR },
                      )}
                    </p>
                    {co.approvedAt && (
                      <p>
                        Aprovado em{' '}
                        {format(new Date(co.approvedAt), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    )}
                    {co.rejectedAt && (
                      <p>
                        Rejeitado em{' '}
                        {format(new Date(co.rejectedAt), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>

                  {/* Histórico de aprovação */}
                  <ApprovalHistory changeOrder={co} />

                  {/* Ações */}
                  <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex-wrap">
                    {/* PM submete DRAFT próprio */}
                    {co.status === 'DRAFT' && (co.requester?.id === userId || co.createdBy === userId) && (
                      <PermissionGate role={['PM', 'SOCIO']}>
                        <Button
                          onClick={handleSubmit}
                          disabled={loading}
                          size="sm"
                          aria-label="Submeter change order para aprovação"
                        >
                          <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                          Submeter para Aprovação
                        </Button>
                      </PermissionGate>
                    )}

                    {/* SOCIO aprova ou rejeita */}
                    {co.status === 'PENDING_APPROVAL' && (
                      <PermissionGate role="SOCIO">
                        <Button
                          onClick={handleApprove}
                          disabled={loading}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          aria-label={`Aprovar change order: ${co.title}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                          Aprovar
                        </Button>
                        <Button
                          onClick={() => setShowRejectModal(true)}
                          disabled={loading}
                          variant="ghost"
                          size="sm"
                          className="border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                          aria-label={`Rejeitar change order: ${co.title}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                          Rejeitar
                        </Button>
                      </PermissionGate>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {showRejectModal && co && (
        <RejectionModal
          changeOrderId={changeOrderId}
          projectId={projectId}
          title={co.title}
          onClose={() => setShowRejectModal(false)}
          onRejected={onUpdated}
        />
      )}
    </>
  )
}
