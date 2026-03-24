'use client'

// src/hooks/use-baselines.ts
// Hook para fetch de baselines e detalhe (module-9-scopeshield-board)
// RESOLVED: React Query migration (G03)

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/toast'
import { QUERY_KEYS } from '@/lib/constants/query-keys'
import type { ScopeBaselineSummary, ScopeBaselineDetail } from '@/types/board'

interface UseBaselinesReturn {
  baselines: ScopeBaselineSummary[]
  loading: boolean
  error: string | null
  selectedBaseline: ScopeBaselineDetail | null
  loadingDetail: boolean
  fetchBaselines: () => void
  fetchBaselineDetail: (baselineId: string) => Promise<void>
  createBaseline: (name: string, description?: string) => Promise<boolean>
  clearSelection: () => void
}

export function useBaselines(projectId: string): UseBaselinesReturn {
  const queryClient = useQueryClient()
  const [selectedBaseline, setSelectedBaseline] = useState<ScopeBaselineDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.baselines.byProject(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/scope-baseline`)
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      return res.json() as Promise<ScopeBaselineSummary[]>
    },
    staleTime: 30_000,
  })

  const fetchBaselines = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.baselines.byProject(projectId) })
  }, [queryClient, projectId])

  const fetchBaselineDetail = useCallback(async (baselineId: string) => {
    setLoadingDetail(true)
    try {
      const cached = queryClient.getQueryData<ScopeBaselineDetail>(
        QUERY_KEYS.baselines.detail(projectId, baselineId)
      )
      if (cached) {
        setSelectedBaseline(cached)
        return
      }
      const res = await fetch(`/api/projects/${projectId}/scope-baseline/${baselineId}`)
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const data: ScopeBaselineDetail = await res.json()
      queryClient.setQueryData(QUERY_KEYS.baselines.detail(projectId, baselineId), data)
      setSelectedBaseline(data)
    } catch {
      toast.error('Erro ao carregar detalhe do baseline.')
    } finally {
      setLoadingDetail(false)
    }
  }, [projectId, queryClient])

  const createMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const res = await fetch(`/api/projects/${projectId}/scope-baseline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? `Erro ${res.status}`)
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Baseline criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.baselines.byProject(projectId) })
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erro ao criar baseline.')
    },
  })

  const createBaseline = useCallback(async (name: string, description?: string): Promise<boolean> => {
    try {
      await createMutation.mutateAsync({ name, description })
      return true
    } catch {
      return false
    }
  }, [createMutation])

  const clearSelection = useCallback(() => {
    setSelectedBaseline(null)
  }, [])

  return {
    baselines: listQuery.data ?? [],
    loading: listQuery.isLoading,
    error: listQuery.error ? (listQuery.error as Error).message : null,
    selectedBaseline,
    loadingDetail,
    fetchBaselines,
    fetchBaselineDetail,
    createBaseline,
    clearSelection,
  }
}
