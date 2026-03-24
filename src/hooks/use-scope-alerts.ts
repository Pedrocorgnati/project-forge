// ─── USE SCOPE ALERTS ─────────────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-3
// Rastreabilidade: INT-069
// RESOLVED: React Query migration (G03)

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export interface ScopeAlertSummary {
  id: string
  type: 'SCOPE_CREEP' | 'OUT_OF_SCOPE' | 'DUPLICATE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'OPEN' | 'ACKNOWLEDGED' | 'DISMISSED'
  description: string
  aiRationale: string
  taskId: string
  task: { id: string; title: string; status: string }
  dismissedByUser?: { id: string; name: string } | null
  dismissReason?: string | null
  createdAt: string
}

export function useScopeAlerts(projectId: string, statusFilter?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEYS.scopeAlerts.byProject(projectId, statusFilter),
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/projects/${projectId}/scope-alerts${params}`)
      if (!res.ok) throw new Error(`Erro ao carregar alertas: ${res.status}`)
      const data = await res.json()
      return (data.alerts ?? data) as ScopeAlertSummary[]
    },
    staleTime: 30_000,
  })

  const alerts = query.data ?? []
  const openAlerts = alerts.filter((a) => a.status === 'OPEN')

  return {
    alerts,
    openAlerts,
    highCount: openAlerts.filter((a) => a.severity === 'HIGH').length,
    mediumCount: openAlerts.filter((a) => a.severity === 'MEDIUM').length,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refresh: () =>
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.scopeAlerts.byProject(projectId, statusFilter),
      }),
  }
}
