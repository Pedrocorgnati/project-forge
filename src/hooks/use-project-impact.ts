// ─── USE PROJECT IMPACT ───────────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-3
// Rastreabilidade: INT-075
// RESOLVED: React Query migration (G03)

'use client'

import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export interface ProjectImpact {
  totalApprovedCOs: number
  totalImpactHours: number
  totalImpactCost: number
  pendingCOs: number
  rejectedCOs: number
  approvedCOIds: string[]
}

export function useProjectImpact(projectId: string) {
  const query = useQuery({
    queryKey: QUERY_KEYS.projectImpact.byProject(projectId),
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/change-orders/impact`)
      if (!r.ok) return null
      return r.json() as Promise<ProjectImpact>
    },
    staleTime: 30_000,
  })

  return {
    impact: query.data ?? null,
    loading: query.isLoading,
  }
}
