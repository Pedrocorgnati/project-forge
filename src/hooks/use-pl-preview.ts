// ─── USE P&L PREVIEW ────────────────────────────────────────────────────────
// module-14-rentabilia-timesheet / TASK-6
// Hook para dados de rentabilidade (P&L preview)
// RESOLVED: React Query migration (G03)

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRentabilityDashboard } from '@/actions/rentabilia'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export interface PLData {
  hasEstimate: boolean
  revenueMin?: number
  revenueMax?: number
  totalCost?: number
  marginMin?: number
  marginMax?: number
  marginPctMin?: number
  marginPctMax?: number
  totalHours?: number
  billableHours?: number
}

export function usePLPreview(projectId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEYS.plPreview.byProject(projectId),
    queryFn: async () => {
      const result = await getRentabilityDashboard(projectId)
      if ('error' in result) throw new Error(
        typeof result.error === 'string' ? result.error : 'Erro ao carregar rentabilidade'
      )
      return result.data as PLData
    },
    staleTime: 60_000,
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.plPreview.byProject(projectId) }),
  }
}
