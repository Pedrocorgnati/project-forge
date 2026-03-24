// ─── EVENT TYPES (re-export da fonte canônica: constants/events.ts) ───────────

export { EventType, type EventPayloadMap, type SystemEventPayload } from '@/lib/constants/events'
import type { EventType, EventPayloadMap } from '@/lib/constants/events'

// ─── PAYLOAD TIPADO POR EVENTO ────────────────────────────────────────────────

/** Payload completo para publicação de um evento tipado */
export type EventPayload<T extends EventType> = {
  projectId: string
  data: EventPayloadMap[T]
}

// ─── TIPO DO HANDLER ──────────────────────────────────────────────────────────

import type { Event } from '@prisma/client'

/** Assinatura de um handler de evento — recebe o registro do banco */
export type EventHandler = (event: Event) => Promise<void>
