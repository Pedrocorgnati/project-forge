'use client'

// ─── SCOPE ALERT CARD ────────────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-3
// Rastreabilidade: INT-069

import { useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants/routes'
import { AlertCircle, CheckCircle, XCircle, Brain, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { DismissAlertModal } from './DismissAlertModal'
import type { ScopeAlertSummary } from '@/hooks/use-scope-alerts'
import { UserRole } from '@prisma/client'

interface ScopeAlertCardProps {
  alert: ScopeAlertSummary
  projectId: string
  userRole: string
  onUpdated: () => void
}

const typeConfig = {
  SCOPE_CREEP: { label: 'Scope Creep', variant: 'warning' as const },
  OUT_OF_SCOPE: { label: 'Fora do Escopo', variant: 'error' as const },
  DUPLICATE: { label: 'Duplicada', variant: 'info' as const },
}

const severityConfig = {
  HIGH: { label: 'Alta', variant: 'error' as const },
  MEDIUM: { label: 'Média', variant: 'warning' as const },
  LOW: { label: 'Baixa', variant: 'success' as const },
}

const statusIcons = {
  OPEN: { Icon: AlertCircle, className: 'text-amber-500' },
  ACKNOWLEDGED: { Icon: CheckCircle, className: 'text-blue-500' },
  DISMISSED: { Icon: XCircle, className: 'text-slate-400' },
}

export function ScopeAlertCard({ alert, projectId, userRole, onUpdated }: ScopeAlertCardProps) {
  const [acknowledging, setAcknowledging] = useState(false)
  const [dismissModalOpen, setDismissModalOpen] = useState(false)

  const type = typeConfig[alert.type]
  const severity = severityConfig[alert.severity]
  const status = statusIcons[alert.status]
  const StatusIcon = status.Icon
  const canAct = alert.status === 'OPEN' && (userRole === UserRole.PM || userRole === UserRole.SOCIO)
  const isDismissed = alert.status === 'DISMISSED'

  async function handleAcknowledge() {
    setAcknowledging(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/scope-alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' }),
      })
      if (!res.ok) throw new Error('Falha ao reconhecer alerta')
      toast.success('Alerta reconhecido com sucesso')
      onUpdated()
    } catch {
      toast.error('Erro ao reconhecer alerta. Tente novamente.')
    } finally {
      setAcknowledging(false)
    }
  }

  return (
    <article
      role="article"
      aria-label={`Alerta: ${alert.description}`}
      className={cn(
        'rounded-lg border bg-white dark:bg-slate-800 p-4',
        'border-slate-200 dark:border-slate-700',
        isDismissed && 'opacity-60',
      )}
    >
      {/* Header: badges + status icon */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={type.variant}>{type.label}</Badge>
          <Badge variant={severity.variant} dot>{severity.label}</Badge>
        </div>
        <StatusIcon
          className={cn('w-5 h-5 shrink-0', status.className)}
          aria-hidden="true"
        />
      </div>

      {/* Description */}
      <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
        {alert.description}
      </p>

      {/* Task link */}
      <div className="mb-3">
        <Link
          href={ROUTES.PROJECT_BOARD_TASK(projectId, alert.taskId)}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover dark:text-brand dark:hover:text-brand-hover"
        >
          Tarefa: {alert.task.title}
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>

      {/* AI Rationale */}
      <details className="mb-3 group">
        <summary className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none">
          <Brain className="w-3.5 h-3.5" aria-hidden="true" />
          Justificativa da IA
        </summary>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded p-2.5 leading-relaxed">
          {alert.aiRationale}
        </p>
      </details>

      {/* Dismiss info */}
      {isDismissed && alert.dismissedByUser && (
        <div className="mb-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded p-2.5">
          <p>
            <span className="font-medium">Dispensado por:</span> {alert.dismissedByUser.name}
          </p>
          {alert.dismissReason && (
            <p className="mt-1">
              <span className="font-medium">Motivo:</span> {alert.dismissReason}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      {canAct && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAcknowledge}
            loading={acknowledging}
          >
            Reconhecer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissModalOpen(true)}
          >
            Dispensar
          </Button>
        </div>
      )}

      {/* Dismiss Modal */}
      {dismissModalOpen && (
        <DismissAlertModal
          alertId={alert.id}
          projectId={projectId}
          taskTitle={alert.task.title}
          onClose={() => setDismissModalOpen(false)}
          onDismissed={() => {
            setDismissModalOpen(false)
            onUpdated()
          }}
        />
      )}
    </article>
  )
}
