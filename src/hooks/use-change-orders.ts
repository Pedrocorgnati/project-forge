// ─── USE CHANGE ORDERS ───────────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-2
// Rastreabilidade: INT-074
// RESOLVED: React Query migration (G03)

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export interface ChangeOrderData {
  id: string
  title: string
  description: string
  impactHours: number
  impactCost: number
  affectedTaskIds: string[]
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  // requestedAt é mapeado de createdAt pela API
  requestedAt: string
  // createdAt também pode estar presente na resposta da API
  createdAt?: string
  approvedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  // requester é mapeado de creator pela API
  requester: { id: string; name: string }
  // creator também pode estar presente diretamente
  creator?: { id: string; name: string; role: string }
  // createdBy é o ID do criador (campo bruto do Prisma)
  createdBy?: string
  approver?: { id: string; name: string } | null
  rejector?: { id: string; name: string } | null
}

export function useChangeOrders(projectId: string, statusFilter?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEYS.changeOrders.byProject(projectId, statusFilter),
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/projects/${projectId}/change-orders${params}`)
      if (!res.ok) throw new Error('Erro ao carregar change orders')
      return res.json() as Promise<ChangeOrderData[]>
    },
    staleTime: 30_000,
  })

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.changeOrders.byProject(projectId, statusFilter),
    })

  return {
    changeOrders: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refresh,
  }
}
