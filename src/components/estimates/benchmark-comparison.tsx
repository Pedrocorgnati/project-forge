'use client'

import { formatHours } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { BenchmarkData } from '@/types/estimate-ui'

interface BenchmarkComparisonProps {
  benchmarks: BenchmarkData[]
  estimateItems?: { category: string; hoursMin: number; hoursMax: number }[]
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  className?: string
}

function getPositionLabel(estimate: number, p25: number, p75: number): string {
  if (estimate < p25) return 'Abaixo do mercado'
  if (estimate > p75) return 'Acima do mercado'
  return 'Dentro do mercado'
}

function getPositionClass(estimate: number, p25: number, p75: number): string {
  if (estimate < p25) return 'text-amber-600 dark:text-amber-400'
  if (estimate > p75) return 'text-red-600 dark:text-red-400'
  return 'text-green-600 dark:text-green-400'
}

export function BenchmarkComparison({
  benchmarks,
  estimateItems = [],
  isLoading,
  isError,
  onRetry,
  className,
}: BenchmarkComparisonProps) {
  if (isError) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 py-8', className)}>
        <p className="text-sm text-destructive font-medium">
          Falha ao carregar dados de benchmark.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm font-medium text-brand dark:text-brand hover:underline"
          >
            Tentar novamente
          </button>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)} aria-label="Carregando benchmarks…">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (benchmarks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Benchmarks não disponíveis para esta categoria.
      </p>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {benchmarks.map((bm) => {
        const item = estimateItems.find((i) => i.category === bm.category)
        const estimateHours = item ? (item.hoursMin + item.hoursMax) / 2 : null

        return (
          <div key={bm.category} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {bm.category}
            </p>

            {/* Bar chart */}
            <div className="relative h-6 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              {/* p25 marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-slate-400"
                style={{ left: `${(bm.p25 / bm.p75) * 75}%` }}
                title={`p25: ${formatHours(bm.p25)}`}
              />
              {/* avg fill */}
              <div
                className="absolute top-0 h-full rounded-full bg-brand-light dark:bg-brand/10"
                style={{ width: `${(bm.avg / bm.p75) * 75}%` }}
              />
              {/* p75 marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-slate-400"
                style={{ left: '75%' }}
                title={`p75: ${formatHours(bm.p75)}`}
              />
              {/* estimate marker */}
              {estimateHours !== null && (
                <div
                  className="absolute top-0 h-full w-1 rounded-full bg-brand dark:bg-brand"
                  style={{ left: `${Math.min((estimateHours / bm.p75) * 75, 95)}%` }}
                  title={`Sua estimativa: ${formatHours(estimateHours)}`}
                />
              )}
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>p25: {formatHours(bm.p25)}</span>
              <span>média: {formatHours(bm.avg)}</span>
              <span>p75: {formatHours(bm.p75)}</span>
            </div>

            {estimateHours !== null && (
              <p className={cn('text-xs font-medium', getPositionClass(estimateHours, bm.p25, bm.p75))}>
                Sua estimativa ({formatHours(estimateHours)}): {getPositionLabel(estimateHours, bm.p25, bm.p75)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
