// ─── PL SUMMARY CARDS ────────────────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-6 / ST002
// 4 cards de resumo P&L com semáforo de margem

'use client'

import { TrendingUp, TrendingDown, Minus, DollarSign, BarChart2, Activity } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface PLSummaryCardsProps {
  report: {
    revenue: number
    cost: number
    margin: number
    marginPct: number
    hoursLogged: number
    billableRatio: number
  } | null
  isLoading?: boolean
}

function TrendIcon({ value }: { value: number }) {
  if (value > 1) return <TrendingUp className="h-4 w-4 text-emerald-500" />
  if (value < -1) return <TrendingDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-slate-400" />
}

export function PLSummaryCards({ report, isLoading }: PLSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            role="status"
            aria-busy="true"
            aria-label="Carregando..."
            className="rounded-lg border p-4 animate-pulse bg-slate-200 dark:bg-slate-700 h-28"
          >
            <span className="sr-only">Carregando...</span>
          </div>
        ))}
      </div>
    )
  }

  if (!report) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Receita Esperada', 'Custo Acumulado', 'Margem Absoluta', 'Margem %'].map((label) => (
          <div key={label} className="rounded-lg border p-4 bg-card">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
            <div className="text-2xl font-bold text-slate-400">R$ 0</div>
          </div>
        ))}
      </div>
    )
  }

  const marginIsHealthy = report.marginPct > 40
  const marginIsWarning = report.marginPct > 20 && report.marginPct <= 40

  const cards = [
    {
      label: 'Receita Esperada',
      value: formatCurrency(report.revenue),
      icon: DollarSign,
      subtext: 'Baseado no estimate ativo',
      trend: 0,
      className: '',
    },
    {
      label: 'Custo Acumulado',
      value: formatCurrency(report.cost),
      icon: BarChart2,
      subtext: `${report.hoursLogged.toFixed(0)}h registradas`,
      trend: 0,
      className: '',
    },
    {
      label: 'Margem Absoluta',
      value: formatCurrency(report.margin),
      icon: TrendingUp,
      subtext: `${report.billableRatio.toFixed(0)}% horas faturáveis`,
      trend: report.margin > 0 ? 1 : -1,
      className: report.margin > 0
        ? 'border-emerald-200 dark:border-emerald-800'
        : 'border-red-200 dark:border-red-800',
    },
    {
      label: 'Margem %',
      value: `${report.marginPct.toFixed(1)}%`,
      icon: Activity,
      subtext: marginIsHealthy ? 'Saudável' : marginIsWarning ? 'Atenção' : 'Crítico',
      trend: report.marginPct > 30 ? 1 : report.marginPct < 20 ? -1 : 0,
      className: marginIsHealthy
        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10'
        : marginIsWarning
          ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10'
          : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn('rounded-lg border p-4 bg-card', card.className)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">{card.label}</span>
            <card.icon className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{card.value}</div>
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon value={card.trend} />
            <span className="text-xs text-slate-500 dark:text-slate-400">{card.subtext}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
