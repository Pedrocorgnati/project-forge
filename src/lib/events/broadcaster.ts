import { prisma } from '@/lib/db'
import type { EventType, EventPayloadMap } from '@/lib/constants/events'
import { createLogger } from '@/lib/logger'

const log = createLogger('events/broadcaster')

// ─── EVENT BROADCASTER ────────────────────────────────────────────────────────

/**
 * Broadcaster server-side via pg_notify.
 * Garante que o evento chegue ao Supabase Realtime channel `system_events`
 * mesmo que o trigger SQL não esteja ativo.
 *
 * NUNCA chamar diretamente dos módulos de feature — usar EventBus.publish().
 */
export class EventBroadcaster {
  /**
   * Executa pg_notify no canal 'system_events' com o payload serializado.
   * Falhas são capturadas e logadas — nunca propagam para o caller.
   */
  static async broadcast<T extends EventType>(
    type: T,
    projectId: string,
    payload: EventPayloadMap[T],
  ): Promise<void> {
    const notification = JSON.stringify({
      type,
      projectId,
      payload,
      timestamp: Date.now(),
    })

    try {
      await prisma.$executeRaw`SELECT pg_notify('system_events', ${notification}::text)`
    } catch (error) {
      // pg_notify failure não deve quebrar o fluxo de publicação do evento
      log.error(
        { type, projectId, err: error instanceof Error ? error.message : String(error) },
        '[EventBroadcaster] pg_notify falhou',
      )
    }
  }
}
