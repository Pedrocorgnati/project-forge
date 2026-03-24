// ─── MARGIN GAUGE ─────────────────────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-6 / ST003
// Indicador SVG semicircular de saúde da margem (3 estados)

'use client'

import { cn } from '@/lib/utils'

interface MarginGaugeProps {
  marginPct: number
  isLoading?: boolean
}

export function MarginGauge({ marginPct, isLoading }: MarginGaugeProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Carregando indicador de margem..."
        className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg h-full min-h-[120px]"
      >
        <span className="sr-only">Carregando...</span>
      </div>
    )
  }

  const status: 'healthy' | 'warning' | 'danger' =
    marginPct > 40 ? 'healthy' : marginPct > 20 ? 'warning' : 'danger'

  const config = {
    healthy: {
      label: 'Saudável',
      description: 'Margem acima de 40%',
      ringColor: 'stroke-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/10',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    warning: {
      label: 'Atenção',
      description: 'Margem entre 20% e 40%',
      ringColor: 'stroke-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/10',
      border: 'border-amber-200 dark:border-amber-800',
    },
    danger: {
      label: 'Crítico',
      description: 'Margem abaixo de 20%',
      ringColor: 'stroke-red-500',
      textColor: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/10',
      border: 'border-red-200 dark:border-red-800',
    },
  }

  const { label, description, ringColor, textColor, bg, border } = config[status]

  // SVG gauge arc (semicircular)
  const radius = 40
  const circumference = Math.PI * radius // half-circle arc length ≈ 125.66
  const clampedPct = Math.min(100, Math.max(0, marginPct))
  const progress = (clampedPct / 100) * circumference

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex flex-col items-center justify-center min-h-[160px]',
        bg,
        border,
      )}
      role="img"
      aria-label={`Indicador de margem: ${clampedPct.toFixed(0)}% — ${label}`}
    >
      <div className="relative">
        <svg width="100" height="60" viewBox="0 0 100 60" aria-hidden="true">
          {/* Track */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            strokeWidth="8"
            className="stroke-slate-200 dark:stroke-slate-600"
          />
          {/* Progress */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            className={ringColor}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className={cn('text-xl font-bold', textColor)}>
            {clampedPct.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="text-center mt-2">
        <p className={cn('font-semibold text-sm', textColor)}>{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-3">
        {[
          { color: 'bg-red-400', label: '<20%' },
          { color: 'bg-amber-400', label: '20-40%' },
          { color: 'bg-emerald-400', label: '>40%' },
        ].map((band) => (
          <div key={band.label} className="flex items-center gap-1">
            <div className={cn('w-2 h-2 rounded-full', band.color)} aria-hidden="true" />
            <span className="text-xs text-slate-500 dark:text-slate-400">{band.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
