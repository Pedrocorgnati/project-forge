// ─── USE PROFIT REPORT ───────────────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-6
// Hook para buscar o relatório de P&L mais recente de um projeto
// RESOLVED: React Query migration (G03)

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export interface TeamMemberCost {
  userId: string
  userName: string
  role: string
  hours: number
  billableHours: number
  effectiveRate?: number
  cost: number
  pctOfTotal: number
}

export interface ProfitReport {
  id: string
  projectId: string
  period: 'WEEKLY' | 'MONTHLY' | 'FULL'
  periodStart: string | null
  periodEnd: string | null
  revenue: number
  cost: number
  margin: number
  marginPct: number
  hoursLogged: number
  billableHours: number
  billableRatio: number
  teamCosts: TeamMemberCost[]
  aiInsights: string | null
  generatedAt: string
}

export interface BurnRateSummary {
  costPerDay: number
  projectedTotalCost: number
  isOverBudget: boolean
}

export function useProfitReport(
  projectId: string,
  period: 'WEEKLY' | 'MONTHLY' | 'FULL',
) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEYS.profitReport.byProject(projectId, period),
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/profit-reports?page=1&limit=1&period=${period}`,
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? 'Erro ao carregar relatório de rentabilidade')
      }
      const body = await res.json()
      const first: ProfitReport | undefined = body?.data?.[0]
      if (!first) return null

      const apiData = first as Partial<ProfitReport> & Omit<ProfitReport, 'billableRatio'>
      return {
        ...first,
        billableRatio:
          typeof apiData.billableRatio === 'number'
            ? apiData.billableRatio
            : apiData.hoursLogged > 0
              ? (apiData.billableHours / apiData.hoursLogged) * 100
              : 0,
        teamCosts: Array.isArray(first.teamCosts) ? first.teamCosts : [],
      } satisfies ProfitReport
    },
    staleTime: 60_000,
  })

  const report = query.data ?? null
  const burnRate: BurnRateSummary | null = report
    ? {
        costPerDay: report.hoursLogged > 0
          ? report.cost / Math.max(1, Math.ceil(report.hoursLogged / 8))
          : 0,
        projectedTotalCost: report.cost,
        isOverBudget: report.cost > report.revenue,
      }
    : null

  return {
    report,
    burnRate,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profitReport.byProject(projectId, period) }),
  }
}
