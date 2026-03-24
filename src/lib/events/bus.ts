import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { EventType } from '@/lib/constants/events'
import type { EventPayloadMap } from '@/lib/constants/events'
import { isValidUuid } from '@/lib/utils/validate'

// ─── EVENT BUS ────────────────────────────────────────────────────────────────

/**
 * Ponto único de publicação de eventos internos.
 * Persiste o evento na tabela `events` e dispara pg_notify via trigger SQL.
 *
 * NUNCA importar de módulos de feature (module-5+) neste arquivo.
 */
export class EventBus {
  /**
   * Publica um evento tipado no barramento.
   *
   * @param type - Tipo do evento (constante de EventType)
   * @param projectId - UUID do projeto associado
   * @param data - Payload tipado conforme EventPayloadMap
   * @param sourceModule - Módulo que originou o evento (para rastreabilidade)
   */
  static async publish<T extends EventType>(
    type: T,
    projectId: string,
    data: EventPayloadMap[T],
    sourceModule = 'event-bus',
  ): Promise<void> {
    // Validar projectId como UUID v4
    if (!isValidUuid(projectId)) {
      throw new Error(`VAL_001: projectId inválido — deve ser UUID v4: ${projectId}`)
    }

    // Persistir evento no banco (fonte de verdade)
    // O trigger SQL trg_notify_system_event dispara pg_notify após cada INSERT
    await prisma.event.create({
      data: {
        type,
        projectId,
        payload: data as unknown as Prisma.JsonObject,
        sourceModule,
        processedAt: null,
      },
    })

    // Broadcaster (pg_notify explícito — garante entrega mesmo sem trigger ativo)
    try {
      const { EventBroadcaster } = await import('./broadcaster')
      await EventBroadcaster.broadcast(type, projectId, data)
    } catch {
      // broadcaster é best-effort — falha não quebra o fluxo de publicação
    }
  }
}
