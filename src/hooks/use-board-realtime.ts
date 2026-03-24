'use client'

// src/hooks/use-board-realtime.ts
// Hook de Supabase Realtime para sincronização do Kanban board (module-9-scopeshield-board)

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TaskWithAssignee } from '@/types/board'

interface UseBoardRealtimeProps {
  projectId: string
  userId: string
  enabled: boolean
  setTasks: React.Dispatch<React.SetStateAction<TaskWithAssignee[]>>
}

interface TaskBroadcastPayload {
  event: 'task:created' | 'task:updated' | 'task:deleted'
  userId: string
  task: TaskWithAssignee
}

export function useBoardRealtime({
  projectId,
  userId,
  enabled,
  setTasks,
}: UseBoardRealtimeProps) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!enabled || !projectId) return

    const supabase = createClient()
    const channelName = `project:${projectId}:tasks`

    const channel = supabase.channel(channelName)

    channel
      .on('broadcast', { event: 'task:created' }, ({ payload }: { payload: TaskBroadcastPayload }) => {
        // Ignore own events (already handled optimistically)
        if (payload.userId === userId) return

        setTasks((prev) => {
          // Avoid duplicates
          if (prev.some((t) => t.id === payload.task.id)) return prev
          return [...prev, payload.task]
        })
      })
      .on('broadcast', { event: 'task:updated' }, ({ payload }: { payload: TaskBroadcastPayload }) => {
        if (payload.userId === userId) return

        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== payload.task.id) return t
            // Only apply if remote is newer
            if (new Date(payload.task.updatedAt) <= new Date(t.updatedAt)) return t
            return payload.task
          }),
        )
      })
      .on('broadcast', { event: 'task:deleted' }, ({ payload }: { payload: TaskBroadcastPayload }) => {
        if (payload.userId === userId) return
        setTasks((prev) => prev.filter((t) => t.id !== payload.task.id))
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [projectId, userId, enabled, setTasks])

  return channelRef
}
