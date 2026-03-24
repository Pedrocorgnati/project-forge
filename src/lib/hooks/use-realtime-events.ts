'use client'

import { useState, useEffect, useRef } from 'react'
import { subscribeToProjectEvents, unsubscribe } from '@/lib/realtime/subscription'
import type { SystemEventPayload, EventType } from '@/lib/constants/events'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface UseRealtimeEventsOptions {
  /** ID do projeto a escutar */
  projectId: string
  /** Filtro client-side por tipo de evento (undefined = todos) */
  eventTypes?: EventType[]
  /** Callback chamado a cada evento recebido */
  onEvent?: (payload: SystemEventPayload<EventType>) => void
}

interface UseRealtimeEventsReturn {
  events: SystemEventPayload<EventType>[]
  isConnected: boolean
  lastEvent: SystemEventPayload<EventType> | null
}

const MAX_EVENTS_IN_MEMORY = 50

// ─── HOOK ─────────────────────────────────────────────────────────────────────

/**
 * Hook para subscrição a eventos de um projeto via Supabase Realtime.
 * Gerencia o ciclo de vida completo: setup, teardown e acumulação de eventos.
 *
 * @param options - projectId, eventTypes (filtro) e onEvent callback
 */
export function useRealtimeEvents(options: UseRealtimeEventsOptions): UseRealtimeEventsReturn {
  const [events, setEvents] = useState<SystemEventPayload<EventType>[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<SystemEventPayload<EventType> | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!options.projectId) return

    const handleEvent = (payload: SystemEventPayload<EventType>) => {
      // Filtro client-side por tipo
      if (options.eventTypes && !options.eventTypes.includes(payload.type)) return

      setEvents((prev) => {
        const updated = [payload, ...prev]
        return updated.slice(0, MAX_EVENTS_IN_MEMORY)
      })
      setLastEvent(payload)
      options.onEvent?.(payload)
    }

    channelRef.current = subscribeToProjectEvents(options.projectId, handleEvent)
    setIsConnected(true)

    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current).then(() => setIsConnected(false))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.projectId])

  return { events, isConnected, lastEvent }
}
