// ─── CHECKPOINT COMPARISON ───────────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-7 / ST005
// View side-by-side de comparação entre dois checkpoints com deltas

'use client'

import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCheckpointComparison } from '@/hooks/use-checkpoint-comparison'
import { formatCurrency } from '@/lib/utils/format'

interface CheckpointComparisonProps {
  projectId: string
  checkpointAId: string
  checkpointBId: string
  onBack: () => void
}

interface Delta {
  absolute: number
  pct: number
  trend: string
}

function DeltaBadge({ delta }: { delta: Delta }) {
  const isPositive = delta.trend === 'up'
  const isNegative = delta.trend === 'down'
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

  return (
    <div
      className={`flex items-center gap-1 text-xs font-medium ${
        isPositive
          ? 'text-emerald-600 dark:text-emerald-400'
          : isNegative
            ? 'text-red-600 dark:text-red-400'
            : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {delta.absolute > 0 ? '+' : ''}
      {delta.absolute.toFixed(0)} ({delta.pct > 0 ? '+' : ''}
      {delta.pct.toFixed(1)}%)
    </div>
  )
}

export function CheckpointComparison({
  projectId,
  checkpointAId,
  checkpointBId,
  onBack,
}: CheckpointComparisonProps) {
  const { comparison, isLoading, error } = useCheckpointComparison(
    projectId,
    checkpointAId,
    checkpointBId,
  )

  if (isLoading) {
    return (
      <div
        className="animate-pulse bg-muted rounded-lg h-64"
        aria-busy="true"
        aria-label="Carregando comparação"
      />
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onBack} aria-label="Voltar para timeline de checkpoints">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div role="alert" className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      </div>
    )
  }

  if (!comparison) return null

  const metrics = [
    { key: 'revenue', label: 'Receita Esperada', format: formatCurrency },
    { key: 'cost', label: 'Custo Acumulado', format: formatCurrency },
    { key: 'margin', label: 'Margem Absoluta', format: formatCurrency },
    {
      key: 'marginPct',
      label: 'Margem %',
      format: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      key: 'hoursLogged',
      label: 'Horas Registradas',
      format: (v: number) => `${v.toFixed(1)}h`,
    },
    {
      key: 'billableHours',
      label: 'Horas Faturáveis',
      format: (v: number) => `${v.toFixed(1)}h`,
    },
    { key: 'projectedCost', label: 'Custo Projetado', format: formatCurrency },
  ] as const

  return (
    <div className="rounded-lg border bg-card">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onBack}
          aria-label="Voltar para timeline de checkpoints"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <h3 className="font-medium text-sm">Comparação de Checkpoints</h3>
          <p className="text-xs text-muted-foreground">
            {comparison.checkpointA.name} → {comparison.checkpointB.name}
          </p>
        </div>
      </div>

      {/* Cabeçalho da tabela */}
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-0 border-b bg-muted/30">
        <div className="p-3 text-xs font-medium text-muted-foreground">Métrica</div>
        <div className="p-3 text-xs font-medium">
          <Badge variant="neutral" className="text-xs">
            {comparison.checkpointA.name}
          </Badge>
          <div className="text-muted-foreground mt-0.5 text-[10px]">
            {new Date(comparison.checkpointA.capturedAt).toLocaleDateString('pt-BR')}
          </div>
        </div>
        <div className="p-3 text-xs font-medium">
          <Badge variant="neutral" className="text-xs">
            {comparison.checkpointB.name}
          </Badge>
          <div className="text-muted-foreground mt-0.5 text-[10px]">
            {new Date(comparison.checkpointB.capturedAt).toLocaleDateString('pt-BR')}
          </div>
        </div>
        <div className="p-3 text-xs font-medium text-muted-foreground">Delta</div>
      </div>

      {/* Linhas de métricas */}
      {metrics.map(({ key, label, format }) => {
        const m = comparison.metrics[key as keyof typeof comparison.metrics]
        if (!m) return null
        return (
          <div
            key={key}
            className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-0 border-b last:border-0 hover:bg-accent/20"
          >
            <div className="p-3 text-sm text-muted-foreground">{label}</div>
            <div className="p-3 text-sm font-medium">{format(m.a)}</div>
            <div className="p-3 text-sm font-medium">{format(m.b)}</div>
            <div className="p-3">
              <DeltaBadge delta={m.delta} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
