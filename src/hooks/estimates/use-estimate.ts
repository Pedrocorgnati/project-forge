'use client'

import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

export function useEstimate(projectId: string, estimateId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.estimates.detail(estimateId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/estimates/${estimateId}`)
      if (!res.ok) throw new Error('Falha ao carregar estimativa')
      const data = await res.json()
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useBenchmarks(estimateId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.benchmarks.byEstimate(estimateId),
    queryFn: async () => {
      const res = await fetch(`/api/benchmarks?estimateId=${estimateId}`)
      if (!res.ok) return []
      const data = await res.json()
      return data.data ?? []
    },
    staleTime: 300_000,
  })
}
