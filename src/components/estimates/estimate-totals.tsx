import { formatCurrency, formatHours } from '@/lib/utils/format'
import { HOURLY_RATE_BRL } from '@/lib/constants/billing'

interface EstimateTotalsProps {
  totalMin: number
  totalMax: number
  currency?: string
  hourlyRate?: number
  className?: string
}

export function EstimateTotals({
  totalMin,
  totalMax,
  hourlyRate = HOURLY_RATE_BRL,
  className,
}: EstimateTotalsProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Horas mínimas</p>
          <p className="text-2xl font-bold tabular-nums">{formatHours(totalMin)}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(totalMin * hourlyRate)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Horas máximas</p>
          <p className="text-2xl font-bold tabular-nums">{formatHours(totalMax)}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(totalMax * hourlyRate)}</p>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-brand/20 dark:border-brand/30 bg-brand-light dark:bg-brand/10 p-4">
        <p className="text-xs text-brand dark:text-brand uppercase tracking-wide font-medium">
          Investimento estimado
        </p>
        <p className="text-xl font-bold text-brand-hover dark:text-brand mt-1">
          {formatCurrency(totalMin * hourlyRate)} – {formatCurrency(totalMax * hourlyRate)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Taxa: {formatCurrency(hourlyRate)}/h
        </p>
      </div>
    </div>
  )
}
