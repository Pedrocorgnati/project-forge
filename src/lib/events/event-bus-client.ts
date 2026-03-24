import { api } from '@/lib/utils/api'
import { API } from '@/lib/constants/api-routes'
import type { EventType, EventPayloadMap } from '@/lib/constants/events'

// ─── EVENT BUS CLIENT ────────────────────────────────────────────────────────

/**
 * Cliente de publicação de eventos do sistema.
 * Envia eventos tipados para o endpoint de eventos via POST.
 *
 * Uso:
 *   await EventBusClient.publish(EventType.PROJECT_CREATED, projectId, { ... })
 */
export class EventBusClient {
  /**
   * Publica um evento tipado no barramento.
   *
   * @param type - Tipo do evento (constante de EventType)
   * @param projectId - ID do projeto associado
   * @param data - Payload tipado conforme EventPayloadMap
   */
  static async publish<T extends EventType>(
    type: T,
    projectId: string,
    data: EventPayloadMap[T],
  ): Promise<void> {
    const response = await api.post(API.EVENTS, {
      type,
      projectId,
      data,
      timestamp: new Date().toISOString(),
    })

    if (response.error) {
      console.error(
        `[EventBusClient] Falha ao publicar evento ${type}:`,
        response.error.message,
      )
    }
  }
}
