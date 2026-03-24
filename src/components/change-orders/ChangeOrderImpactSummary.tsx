// ─── CHANGE ORDER IMPACT SUMMARY ──────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-3 / ST003
// Resumo visual do impacto acumulado de COs aprovadas — visível apenas para PM/SOCIO
// Rastreabilidade: INT-075

'use client'

import { useProjectImpact } from '@/hooks/use-project-impact'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { LoadingSpinner } from '@/components/ui/skeleton'
import { Clock, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'

interface ChangeOrderImpactSummaryProps {
  projectId: string
}

function ImpactSummaryContent({ projectId }: ChangeOrderImpactSummaryProps) {
  const { impact, loading } = useProjectImpact(projectId)

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-center min-h-[100px]">
        <LoadingSpinner size="sm" label="Carregando impacto..." />
      </div>
    )
  }

  if (!impact) return null

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        Impacto das Change Orders
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle
            className="h-4 w-4 text-green-500 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {impact.totalApprovedCOs}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              COs aprovadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AlertCircle
            className="h-4 w-4 text-amber-500 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {impact.pendingCOs}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aguardando
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock
            className="h-4 w-4 text-blue-500 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
              +{impact.totalImpactHours}h
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Horas adicionadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DollarSign
            className="h-4 w-4 text-brand shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
              +R${' '}
              {impact.totalImpactCost.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Custo adicional
            </p>
          </div>
        </div>
      </div>

      {impact.rejectedCOs > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700">
          {impact.rejectedCOs} CO{impact.rejectedCOs > 1 ? 's' : ''} rejeitada
          {impact.rejectedCOs > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

export function ChangeOrderImpactSummary({ projectId }: ChangeOrderImpactSummaryProps) {
  return (
    <PermissionGate role={['SOCIO', 'PM']}>
      <ImpactSummaryContent projectId={projectId} />
    </PermissionGate>
  )
}
