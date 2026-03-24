// src/lib/notifications/dispatcher.ts
// BE-06d — NotificationDispatcher: despacha notificações pendentes na fila
// Chamado via GET /api/cron/notification-dispatcher (a cada 5 min)

import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { InAppChannel } from './channels/in-app'
import { EmailChannel } from './channels/email'

const log = createLogger('notifications/dispatcher')

const DISPATCH_BATCH_SIZE = 100

/**
 * Despacha notificações criadas mas ainda não entregues.
 * Usa o campo `deliveredAt` (null = pendente) para filtrar.
 */
export class NotificationDispatcher {
  static async dispatch(): Promise<{ dispatched: number; failed: number }> {
    let dispatched = 0
    let failed = 0

    // Buscar notificações pendentes (sem deliveredAt)
    const pending = await prisma.notification.findMany({
      where: { deliveredAt: null },
      take: DISPATCH_BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { email: true, name: true } },
      },
    })

    for (const notification of pending) {
      try {
        if (notification.channel === 'IN_APP') {
          await InAppChannel.send(notification as never)
        } else if (notification.channel === 'EMAIL' && notification.user.email) {
          await EmailChannel.send(notification.user.email, notification as never)
        }

        await prisma.notification.update({
          where: { id: notification.id },
          data: { deliveredAt: new Date() },
        })
        dispatched++
      } catch (err) {
        log.error({ notificationId: notification.id, err }, '[NotificationDispatcher] Falha ao despachar')
        failed++
      }
    }

    return { dispatched, failed }
  }
}
