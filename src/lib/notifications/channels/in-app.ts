import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@prisma/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('notifications/channels/in-app')

// ─── IN-APP NOTIFICATION CHANNEL ─────────────────────────────────────────────

/**
 * Canal de notificação in-app via Supabase Realtime broadcast.
 * Falhas são capturadas e logadas — nunca propagam para o caller.
 */
export class InAppChannel {
  /**
   * Envia broadcast para o canal do usuário.
   * O cliente subscreve via `subscribeToUserNotifications(userId, callback)`.
   *
   * @param notification - Registro do banco com payload e metadados
   */
  static async send(notification: Notification): Promise<void> {
    // Nota: createClient() é browser-side — em contexto server, o broadcast
    // de notificações é feito via trigger SQL na tabela notifications (TASK-3).
    // Este método é um fallback explícito para garantir entrega.
    try {
      const supabase = createClient()
      const response = await supabase
        .channel(`user:${notification.userId}`)
        .send({
          type: 'broadcast',
          event: 'notification',
          payload: notification,
        })

      if (response !== 'ok') {
        log.error({ userId: notification.userId, response }, '[InAppChannel] Falha no broadcast')
      }
    } catch (error) {
      // Falha de broadcast não quebra o fluxo de NotificationService
      log.error(
        { userId: notification.userId, err: error instanceof Error ? error.message : String(error) },
        '[InAppChannel] Erro inesperado',
      )
    }
  }
}
