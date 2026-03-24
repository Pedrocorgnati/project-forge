// ─── PROFITABILITY CLIENT (shared) ───────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-6 / ST007 + TASK-7 / ST006
// Client orchestrator — orquestra todos os componentes do dashboard
// Usado por: (app)/projects/[id]/profitability e (dashboard)/projects/[id]/profitability

'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { PLSummaryCards } from '@/components/profitability/PLSummaryCards'
import { BurnRateChart } from '@/components/profitability/BurnRateChart'
import { TeamCostBreakdown } from '@/components/profitability/TeamCostBreakdown'
import { MarginGauge } from '@/components/profitability/MarginGauge'
import { PeriodFilter } from '@/components/profitability/PeriodFilter'
import { ExportButtons } from '@/components/profitability/ExportButtons'
import { AIInsightsPanel } from '@/components/profitability/AIInsightsPanel'
import { CheckpointTimeline } from '@/components/profitability/CheckpointTimeline'
import { useProfitReport } from '@/hooks/use-profit-report'

interface ProfitabilityClientProps {
  projectId: string
  userRole: 'SOCIO' | 'PM'
}

export function ProfitabilityClient({ projectId, userRole }: ProfitabilityClientProps) {
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'FULL'>('FULL')
  const { report, isLoading, error } = useProfitReport(projectId, period)

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-slate-400" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Rentabilidade
          </h1>
          {userRole === 'PM' && (
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
              (Visão agregada — rates individuais ocultos)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter value={period} onChange={setPeriod} />
          <ExportButtons projectId={projectId} reportId={report?.id} />
        </div>
      </div>

      {/* Erro de carregamento */}
      {error && !isLoading && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-400"
        >
          {error}
        </div>
      )}

      {/* Cards de resumo + Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <PLSummaryCards report={report} isLoading={isLoading} />
        </div>
        <div>
          <MarginGauge marginPct={report?.marginPct ?? 0} isLoading={isLoading} />
        </div>
      </div>

      {/* Gráfico de Burn Rate */}
      <BurnRateChart projectId={projectId} budget={report?.revenue ?? 0} />

      {/* Tabela de custos por equipe */}
      <TeamCostBreakdown
        teamCosts={report?.teamCosts ?? []}
        isLoading={isLoading}
        showRates={userRole === 'SOCIO'}
      />

      {/* Painel de insights de IA — somente SOCIO */}
      {userRole === 'SOCIO' && (
        <AIInsightsPanel
          projectId={projectId}
          userRole={userRole}
          currentPL={{
            revenue: report?.revenue ?? 0,
            cost: report?.cost ?? 0,
            margin: report?.margin ?? 0,
            marginPct: report?.marginPct ?? 0,
            hoursLogged: report?.hoursLogged ?? 0,
            billableRatio: report?.billableRatio ?? 0,
            period,
          }}
        />
      )}

      {/* Timeline de checkpoints — visível para todos os roles */}
      <CheckpointTimeline
        projectId={projectId}
        currentPL={{
          revenue: report?.revenue ?? 0,
          cost: report?.cost ?? 0,
          margin: report?.margin ?? 0,
          marginPct: report?.marginPct ?? 0,
          hoursLogged: report?.hoursLogged ?? 0,
        }}
      />
    </div>
  )
}
