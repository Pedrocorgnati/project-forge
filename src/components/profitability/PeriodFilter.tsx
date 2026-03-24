// ─── PERIOD FILTER ────────────────────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-6 / ST004
// Seletor de período — Semana / Mês / Total
// Usa botões simples (sem ToggleGroup do Radix que não está instalado)

'use client'

import { cn } from '@/lib/utils'

type Period = 'WEEKLY' | 'MONTHLY' | 'FULL'

interface PeriodFilterProps {
  value: Period
  onChange: (period: Period) => void
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'WEEKLY', label: 'Semana' },
  { value: 'MONTHLY', label: 'Mês' },
  { value: 'FULL', label: 'Total' },
]

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filtro de período"
      className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      {PERIOD_OPTIONS.map((opt, idx) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            aria-label={`Período: ${opt.label}`}
            className={cn(
              'text-xs px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              idx > 0 && 'border-l border-slate-200 dark:border-slate-700',
              isActive
                ? 'bg-brand text-white font-medium'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
