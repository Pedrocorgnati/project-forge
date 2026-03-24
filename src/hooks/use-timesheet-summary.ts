// ─── USE TIMESHEET SUMMARY ──────────────────────────────────────────────────
// module-14-rentabilia-timesheet / TASK-5
// Hook para resumo agregado de horas
// RESOLVED: React Query migration (G03)

'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTimesheetSummary } from '@/actions/rentabilia'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

interface TimesheetSummaryData {
  weekHours: number
  monthHours: number
  totalHours: number
  billableHours: number
  nonBillableHours: number
}

export function useTimesheetSummary(projectId: string, userId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEYS.timesheetSummary.byProject(projectId, userId),
    queryFn: async () => {
      const result = await getTimesheetSummary(projectId, userId)
      if ('error' in result) throw new Error(
        typeof result.error === 'string' ? result.error : 'Erro ao carregar resumo'
      )
      return result.data as TimesheetSummaryData
    },
    staleTime: 30_000,
  })

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timesheetSummary.byProject(projectId, userId) }),
  }
}
