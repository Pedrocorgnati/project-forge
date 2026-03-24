// ─── BURN RATE CHART ─────────────────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-6 / ST005
// Gráfico de burn rate com Recharts — custo cumulativo vs orçamento

'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { useBurnRateTimeline } from '@/hooks/use-burn-rate-timeline'
import { formatCurrency } from '@/lib/utils/format'
import { EmptyState } from '@/components/ui/empty-state'

interface BurnRateChartProps {
  projectId: string
  budget: number
}

interface TooltipPayload {
  value: number
  name: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow text-sm">
      <p className="font-medium mb-1 text-slate-700 dark:text-slate-300">{label}</p>
      <p className="text-brand dark:text-brand">
        Custo: {formatCurrency(payload[0]?.value)}
      </p>
    </div>
  )
}

export function BurnRateChart({ projectId, budget }: BurnRateChartProps) {
  const { timeline, isLoading, error } = useBurnRateTimeline(projectId)

  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Carregando gráfico de burn rate..."
        className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg h-64"
      >
        <span className="sr-only">Carregando...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-4">
        <h3 className="font-medium text-sm mb-4 text-slate-700 dark:text-slate-300">
          Burn Rate — Custo Cumulativo
        </h3>
        <div role="alert" className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      </div>
    )
  }

  if (timeline.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-4">
        <h3 className="font-medium text-sm mb-4 text-slate-700 dark:text-slate-300">
          Burn Rate — Custo Cumulativo
        </h3>
        <EmptyState
          icon={<TrendingUp className="w-full h-full" />}
          title="Sem dados de burn rate"
          description="Registre horas para visualizar o burn rate do projeto"
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card p-4">
      <h3 className="font-medium text-sm mb-4 text-slate-700 dark:text-slate-300">
        Burn Rate — Custo Cumulativo
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={timeline} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(d: string) =>
              new Date(d).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
              })
            }
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="cumulativeCost"
            name="Custo acumulado"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          {budget > 0 && (
            <ReferenceLine
              y={budget}
              stroke="#ef4444"
              strokeDasharray="6 3"
              label={{
                value: 'Orçamento',
                position: 'right',
                fontSize: 11,
                fill: '#ef4444',
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
