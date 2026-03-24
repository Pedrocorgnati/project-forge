// ─── USE CHECKPOINTS ─────────────────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-7 / ST001
// Hook para listar e criar checkpoints de P&L
// RESOLVED: React Query migration (G03)

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export interface CheckpointSummary {
  revenue: number
  cost: number
  margin: number
  marginPct: number
  hoursLogged: number
  billableHours: number
  projectedCost?: number
}

export interface Checkpoint {
  id: string
  projectId: string
  name: string
  createdAt: string
  summary: CheckpointSummary
}

export function useCheckpoints(projectId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEYS.checkpoints.byProject(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/checkpoints`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? 'Erro ao carregar checkpoints')
      }
      const data = await res.json()
      return (Array.isArray(data) ? data : (data?.data ?? [])) as Checkpoint[]
    },
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: async (name?: string): Promise<Checkpoint> => {
      const res = await fetch(`/api/projects/${projectId}/checkpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(name ? { name } : {}),
      })
      if (!res.ok) throw new Error('Falha ao criar checkpoint')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checkpoints.byProject(projectId) })
    },
  })

  return {
    checkpoints: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    createCheckpoint: createMutation.mutateAsync,
    mutate: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checkpoints.byProject(projectId) }),
  }
}
