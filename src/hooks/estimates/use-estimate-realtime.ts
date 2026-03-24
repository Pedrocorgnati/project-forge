'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/query-keys'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEstimateRealtime(projectId: string, initialEstimates: any[]) {
  const [estimates, setEstimates] = useState(initialEstimates)
  const [isLoading] = useState(false)
  const [isError] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`estimates:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Estimate',
          filter: `projectId=eq.${projectId}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setEstimates((prev: any[]) =>
            prev.map((e) => (e.id === payload.new.id ? { ...e, ...payload.new } : e)),
          )
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.estimates.byProject(projectId),
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Estimate',
          filter: `projectId=eq.${projectId}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setEstimates((prev: any[]) => [payload.new as any, ...prev])
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.estimates.byProject(projectId),
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, queryClient])

  return { estimates, isLoading, isError }
}
