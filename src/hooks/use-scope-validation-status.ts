// ─── USE SCOPE VALIDATION STATUS ──────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-3
// Rastreabilidade: INT-069
// RESOLVED: React Query migration (G03)

'use client'

import { useQuery } from '@tanstack/react-query'
import { API } from '@/lib/constants/api-routes'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export interface ScopeValidationStatus {
  isAvailable: boolean
  isChecking: boolean
  lastCheckedAt?: string
}

export function useScopeValidationStatus(_projectId: string): ScopeValidationStatus {
  const query = useQuery({
    queryKey: QUERY_KEYS.scopeValidation.health(),
    queryFn: async () => {
      try {
        const res = await fetch(API.HEALTH_AI, { signal: AbortSignal.timeout(5000) })
        return { isAvailable: res.ok, lastCheckedAt: new Date().toISOString() }
      } catch {
        return { isAvailable: false, lastCheckedAt: new Date().toISOString() }
      }
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })

  return {
    isAvailable: query.data?.isAvailable ?? false,
    isChecking: query.isLoading,
    lastCheckedAt: query.data?.lastCheckedAt,
  }
}
