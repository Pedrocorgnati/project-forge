'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/query-keys'
import { toast } from '@/components/ui/toast'

interface RevisePayload {
  projectId: string
  estimateId: string
  reason: string
}

export function useReviseEstimate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, estimateId, reason }: RevisePayload) => {
      const res = await fetch(`/api/projects/${projectId}/estimates/${estimateId}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Erro ao solicitar revisão')
      }
      return res.json()
    },
    onSuccess: (_, { projectId, estimateId }) => {
      toast.success('Revisão solicitada', {
        description: 'A IA está gerando a nova versão da estimativa.',
      })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.estimates.byProject(projectId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.estimates.detail(estimateId) })
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erro ao solicitar revisão.')
    },
  })
}
