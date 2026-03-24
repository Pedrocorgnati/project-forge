import type { Event } from '@prisma/client'
import { EventType } from '@/lib/constants/events'
import type { EventHandler } from '../types'

// ─── NOOP HANDLERS ───────────────────────────────────────────────────────────
// Handlers observacionais para EventTypes que ainda não possuem lógica de negócio.
// Registram o evento via console.debug para rastreabilidade.
// Quando a lógica real for implementada, mover o handler para o arquivo apropriado
// e remover a entrada correspondente daqui.

type RegisterFn = (type: string, handler: EventHandler) => void

/**
 * Noop handler genérico — apenas loga o evento para observabilidade.
 */
function createNoopHandler(eventType: string): EventHandler {
  return async (event: Event): Promise<void> => {
    console.debug(
      `[event:noop] ${eventType} — id=${event.id} projectId=${event.projectId ?? 'N/A'}`,
      { payload: event.payload },
    )
  }
}

/**
 * EventTypes sem handler de negócio implementado.
 * Cada um recebe um noop handler que loga via console.debug.
 */
const NOOP_EVENT_TYPES = [
  EventType.BRIEF_CREATED,
  EventType.BRIEF_SESSION_STARTED,
  EventType.BRIEF_SESSION_PAUSED,
  EventType.BRIEF_PRD_GENERATED,
  // RAG_INDEX_STARTED e RAG_INDEX_COMPLETED movidos para rag-handlers.ts (module-12)
  EventType.COST_CONFIG_UPDATED,
  EventType.PROFIT_REPORT_GENERATED,
  EventType.CLIENT_ACCESS_GRANTED,
] as const

export function registerNoopHandlers(register: RegisterFn): void {
  for (const type of NOOP_EVENT_TYPES) {
    register(type, createNoopHandler(type))
  }
}
