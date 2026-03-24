// ─── USE COST CONFIG ────────────────────────────────────────────────────────
// module-14-rentabilia-timesheet / TASK-6
// Hook para gerenciar configurações de custo por projeto
// RESOLVED: React Query migration (G03)

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getEffectiveRates, getCostConfigs } from '@/actions/cost-config'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export interface EffectiveRate {
  userId: string
  userName: string
  role: string
  effectiveRate: number
  rateSource: string
  configId: string | null
  overrideId: string | null
}

export interface CostConfig {
  id: string
  projectId: string
  role: string
  hourlyRate: number
  effectiveFrom: Date | string
  effectiveTo: Date | string | null
  createdById: string
  overrides: Array<{
    id: string
    costConfigId: string
    userId: string
    customRate: number
    reason: string
    user: { id: string; name: string; role: string }
  }>
}

export function useCostConfig(projectId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEYS.costConfig.byProject(projectId),
    queryFn: async () => {
      const [ratesResult, configsResult] = await Promise.all([
        getEffectiveRates(projectId),
        getCostConfigs(projectId),
      ])

      const effectiveRates = 'error' in ratesResult ? [] : (ratesResult.data as unknown as EffectiveRate[])
      const configs = 'error' in configsResult ? [] : (configsResult.data as unknown as CostConfig[])

      return { effectiveRates, configs }
    },
    staleTime: 60_000,
  })

  return {
    effectiveRates: query.data?.effectiveRates ?? [],
    configs: query.data?.configs ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.costConfig.byProject(projectId) }),
  }
}
