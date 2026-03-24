import { prisma } from '@/lib/db'
import { getHandlersForType } from './handlers'
import type { Event } from '@prisma/client'

// ─── EVENT WORKER ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 3

/**
 * Processa eventos pendentes na tabela `events`.
 * Chamado pelo cron job (/api/scheduler) ou em testes.
 *
 * Nota: O schema `Event` não possui campos retryCount/lastError nativos.
 * O controle de retry é feito via campo `correlationId` (codificado como JSON).
 */
export class EventWorker {
  /**
   * Processa o próximo lote de eventos não processados.
   *
   * @param batchSize - Número de eventos a processar por chamada
   * @returns Número de eventos processados com sucesso
   */
  static async processNext(batchSize = 10): Promise<number> {
    if (batchSize <= 0) return 0

    const events = await prisma.event.findMany({
      where: { processedAt: null },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    })

    let processed = 0
    for (const event of events) {
      const success = await EventWorker.processOne(event)
      if (success) processed++
    }
    return processed
  }

  /**
   * Processa um único evento: executa handlers e marca como processado.
   *
   * @returns true se processado com sucesso, false em caso de erro
   */
  static async processOne(event: Event): Promise<boolean> {
    const handlers = getHandlersForType(event.type)

    // Recuperar estado de retry do correlationId (usado como fallback de meta)
    const retryState = EventWorker.parseRetryState(event.correlationId)

    try {
      for (const handler of handlers) {
        await handler(event)
      }
      await prisma.event.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      })
      return true
    } catch (error) {
      retryState.count = (retryState.count ?? 0) + 1
      retryState.lastError = error instanceof Error ? error.message : String(error)

      if (retryState.count >= MAX_RETRIES) {
        // Marcar como processado após esgotar tentativas (com erro registrado)
        await prisma.event.update({
          where: { id: event.id },
          data: {
            processedAt: new Date(),
            correlationId: JSON.stringify({ ...retryState, status: 'FAILED' }),
          },
        })
      } else {
        await prisma.event.update({
          where: { id: event.id },
          data: { correlationId: JSON.stringify(retryState) },
        })
      }
      return false
    }
  }

  private static parseRetryState(correlationId: string | null): {
    count: number
    lastError?: string
    status?: string
  } {
    if (!correlationId) return { count: 0 }
    try {
      const parsed = JSON.parse(correlationId)
      return typeof parsed === 'object' && parsed !== null ? parsed : { count: 0 }
    } catch {
      return { count: 0 }
    }
  }
}
