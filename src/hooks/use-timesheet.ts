// ─── USE TIMESHEET ──────────────────────────────────────────────────────────
// module-14-rentabilia-timesheet / TASK-5
// Hook para listar entradas de timesheet por semana
// RESOLVED: React Query migration (G03)

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTimeEntries } from '@/actions/rentabilia'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export interface TimesheetEntry {
  id: string
  projectId: string
  userId: string
  taskId: string | null
  hours: number
  role: string
  workDate: Date | string
  description: string | null
  notes: string | null
  billable: boolean
  createdAt: Date | string
  user: { id: string; name: string; role: string }
  task: { id: string; title: string } | null
}

export function useTimesheet(
  projectId: string,
  week?: string,
  userId?: string,
) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEYS.timesheet.byProject(projectId, week, userId),
    queryFn: async () => {
      const result = await getTimeEntries({ projectId, week, userId, limit: 100 })
      if ('error' in result) throw new Error(
        typeof result.error === 'string' ? result.error : 'Erro ao carregar registros'
      )
      return { entries: result.data as unknown as TimesheetEntry[], total: result.total }
    },
    staleTime: 30_000,
  })

  return {
    entries: query.data?.entries ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timesheet.byProject(projectId, week, userId) }),
  }
}
