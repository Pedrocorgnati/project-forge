// ─── USE BURN RATE TIMELINE ──────────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-6
// Hook para buscar histórico de burn rate de um projeto
// RESOLVED: React Query migration (G03)

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export interface BurnRatePoint {
  date: string
  cumulativeCost: number
  budget: number
}

export function useBurnRateTimeline(projectId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEYS.burnRateTimeline.byProject(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/profit-reports?page=1&limit=30`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? 'Erro ao carregar histórico de burn rate')
      }
      const body = await res.json()
      const reports: Array<{ generatedAt: string; cost: number | string; revenue: number | string }> =
        body?.data ?? []

      return reports
        .map((r) => ({
          date: r.generatedAt,
          cumulativeCost: Number(r.cost),
          budget: Number(r.revenue),
        }))
        .reverse() as BurnRatePoint[]
    },
    staleTime: 60_000,
  })

  return {
    timeline: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.burnRateTimeline.byProject(projectId) }),
  }
}
