'use client'

// src/components/cost-config/PLPreview.tsx
// module-14-rentabilia-timesheet / TASK-6
// Preview de P&L (Receita / Custo / Margem) do projeto

import { usePLPreview } from '@/hooks/use-pl-preview'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatPercentage, formatHours } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface PLPreviewProps {
  projectId: string
}

function getMarginColor(marginPct: number): string {
  if (marginPct > 40) return 'text-green-600 dark:text-green-400'
  if (marginPct >= 20) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getMarginBg(marginPct: number): string {
  if (marginPct > 40) return 'bg-green-50 dark:bg-green-900/20'
  if (marginPct >= 20) return 'bg-amber-50 dark:bg-amber-900/20'
  return 'bg-red-50 dark:bg-red-900/20'
}

export function PLPreview({ projectId }: PLPreviewProps) {
  const { data, isLoading, error } = usePLPreview(projectId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton variant="text" lines={1} />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton variant="card" className="h-24" />
            <Skeleton variant="card" className="h-24" />
            <Skeleton variant="card" className="h-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.hasEstimate) {
    return (
      <Card>
        <CardContent>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhuma estimativa encontrada para este projeto.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Crie uma estimativa no EstimAI para visualizar a projecao de receita e margem.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const marginPctMin = data.marginPctMin ?? 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Projecao P&L
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{formatHours(data.totalHours ?? 0)} registradas</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>{formatHours(data.billableHours ?? 0)} faturaveis</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Receita */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
              Receita estimada
            </p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(data.revenueMin)}
            </p>
            {data.revenueMin !== data.revenueMax && (
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
                ate {formatCurrency(data.revenueMax)}
              </p>
            )}
          </div>

          {/* Custo */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
              Custo total
            </p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(data.totalCost)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              baseado em horas registradas
            </p>
          </div>

          {/* Margem */}
          <div className={cn('rounded-lg p-4', getMarginBg(marginPctMin))}>
            <p className={cn('text-xs font-medium uppercase tracking-wide mb-1', getMarginColor(marginPctMin))}>
              Margem
            </p>
            <p className={cn('text-lg font-bold', getMarginColor(marginPctMin))}>
              {formatPercentage(marginPctMin, true)}
            </p>
            <p className={cn('text-xs mt-0.5', getMarginColor(marginPctMin))}>
              {formatCurrency(data.marginMin)}
              {data.marginMin !== data.marginMax && (
                <> a {formatCurrency(data.marginMax)}</>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
