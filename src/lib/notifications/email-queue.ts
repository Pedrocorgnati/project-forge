import { prisma } from '@/lib/db'
import { NOTIFICATION_LIMITS } from '@/lib/constants/notifications'
import type { EventType } from '@/lib/constants/events'

// ─── EMAIL QUEUE ──────────────────────────────────────────────────────────────

interface QueueEmailParams {
  to: string
  type: EventType | string
  projectId?: string
  subject: string
  html?: string
}

/**
 * Fila de emails com deduplicação por janela de tempo.
 * Evita envio duplicado do mesmo email para o mesmo destinatário e tipo
 * dentro de `NOTIFICATION_LIMITS.DEDUP_WINDOW_MS`.
 */
export class EmailQueue {
  /**
   * Verifica se já existe email do mesmo tipo para o destinatário na janela de dedup.
   * Emails com status FAILED não contam para deduplicação (permite reenvio).
   */
  static async isDuplicate(to: string, type: string, projectId?: string): Promise<boolean> {
    const since = new Date(Date.now() - NOTIFICATION_LIMITS.DEDUP_WINDOW_MS)

    const count = await prisma.emailLog.count({
      where: {
        to,
        type,
        projectId: projectId ?? null,
        sentAt: { gte: since },
        status: { in: ['SENT', 'PENDING'] },
      },
    })
    return count > 0
  }

  /**
   * Enfileira email após verificar deduplicação.
   *
   * @returns true se enfileirado, false se duplicata detectada
   */
  static async enqueue(params: QueueEmailParams): Promise<boolean> {
    const isDup = await EmailQueue.isDuplicate(params.to, params.type, params.projectId)
    if (isDup) return false

    await prisma.emailLog.create({
      data: {
        to: params.to,
        type: params.type,
        projectId: params.projectId ?? null,
        subject: params.subject,
        status: 'PENDING',
        sentAt: new Date(),
      },
    })
    return true
  }

  /**
   * Atualiza status do EmailLog após resposta do webhook Resend.
   *
   * @param emailLogId - ID do EmailLog no banco
   * @param status - SENT | BOUNCED | COMPLAINED | FAILED
   * @param resendMessageId - ID da mensagem no Resend (opcional)
   */
  static async updateStatus(
    emailLogId: string,
    status: 'SENT' | 'BOUNCED' | 'COMPLAINED' | 'FAILED',
    resendMessageId?: string,
  ): Promise<void> {
    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        status,
        resendMessageId: resendMessageId ?? null,
      },
    })
  }
}
