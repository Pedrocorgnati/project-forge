'use client'

import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export function useEstimates(projectId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.estimates.byProject(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/estimates`)
      if (!res.ok) throw new Error('Falha ao carregar estimativas')
      const data = await res.json()
      return data.data
    },
    staleTime: 30_000,
  })
}
