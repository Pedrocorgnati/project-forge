// ─── USE CHECKPOINT COMPARISON ───────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-7 / ST001
// Hook para comparação side-by-side entre dois checkpoints
// RESOLVED: React Query migration (G03)

'use client'

import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

interface MetricDelta {
  a: number
  b: number
  delta: {
    absolute: number
    pct: number
    trend: 'up' | 'down' | 'flat'
  }
}

interface CheckpointInfo {
  id: string
  name: string
  capturedAt: string
}

export interface CheckpointComparisonData {
  checkpointA: CheckpointInfo
  checkpointB: CheckpointInfo
  metrics: {
    revenue?: MetricDelta
    cost?: MetricDelta
    margin?: MetricDelta
    marginPct?: MetricDelta
    hoursLogged?: MetricDelta
    billableHours?: MetricDelta
    projectedCost?: MetricDelta
  }
}

export function useCheckpointComparison(
  projectId: string,
  checkpointAId: string,
  checkpointBId: string,
) {
  const query = useQuery({
    queryKey: QUERY_KEYS.checkpoints.comparison(projectId, checkpointAId, checkpointBId),
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/checkpoints/compare?a=${checkpointAId}&b=${checkpointBId}`,
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? 'Erro ao comparar checkpoints')
      }
      return res.json() as Promise<CheckpointComparisonData>
    },
    enabled: !!checkpointAId && !!checkpointBId,
    staleTime: 60_000,
  })

  return {
    comparison: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  }
}
