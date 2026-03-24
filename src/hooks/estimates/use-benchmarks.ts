'use client'

import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/query-keys'
import type { BenchmarkData } from '@/types/estimate-ui'

export function useBenchmarks(estimateId: string) {
  return useQuery<BenchmarkData[]>({
    queryKey: QUERY_KEYS.benchmarks.byEstimate(estimateId),
    queryFn: async () => {
      const res = await fetch(`/api/benchmarks?estimateId=${estimateId}`)
      if (!res.ok) throw new Error('Falha ao carregar benchmarks')
      const data = await res.json()
      return data.data ?? []
    },
    staleTime: 300_000,
  })
}
