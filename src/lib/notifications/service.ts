import { prisma } from '@/lib/db'
import { NotificationChannel, NotificationPriority } from '@prisma/client'
import { checkAntiFatigue, isQuietHoursNow } from './anti-fatigue'
import { InAppChannel } from './channels/in-app'
import { EmailChannel } from './channels/email'
import type { EventType } from '@/lib/constants/events'

// ─── NOTIFICATION SERVICE ─────────────────────────────────────────────────────

export interface SendNotificationParams {
  /** ID do usuário interno (tabela users) */
  userId: string
  /** Tipo de evento que originou a notificação */
  type: EventType | string
  /** Título da notificação (armazenado em payload.title) */
  title: string
  /** Corpo da notificação (armazenado em payload.body) */
  body: string
  /** ID do projeto associado (opcional) */
  projectId?: string
  /** URL para navegar ao clicar (armazenado em payload.actionUrl) */
  actionUrl?: string
  /** Metadados extras (armazenados no payload) */
  metadata?: Record<string, unknown>
  /** Prioridade (default: LOW) */
  priority?: NotificationPriority
}

/**
 * Ponto único de orquestração de notificações.
 * Gerencia verificação de preferências, anti-fadiga, quiet hours,
 * criação no banco e disparo dos canais in-app e email.
 */
export class NotificationService {
  /**
   * Envia uma notificação para um usuário interno.
   * Verifica quiet hours, anti-fadiga e preferências antes de criar.
   */
  static async send(params: SendNotificationParams): Promise<void> {
    // Validações de entrada
    if (!params.userId || !params.title || !params.body) {
      throw new Error('NOTIF_VAL_001: userId, title e body são obrigatórios')
    }

    // 1. Verificar quiet hours (global — schema não suporta por usuário ainda)
    if (isQuietHoursNow()) return

    // 2. Verificar anti-fadiga
    const allowed = await checkAntiFatigue(params.userId, params.type as EventType)
    if (!allowed) return

    // 3. Buscar preferências do usuário por canal
    const [inAppPref, emailPref] = await Promise.all([
      prisma.notificationPreference.findUnique({
        where: {
          userId_eventType_channel: {
            userId: params.userId,
            eventType: params.type,
            channel: NotificationChannel.IN_APP,
          },
        },
      }),
      prisma.notificationPreference.findUnique({
        where: {
          userId_eventType_channel: {
            userId: params.userId,
            eventType: params.type,
            channel: NotificationChannel.EMAIL,
          },
        },
      }),
    ])

    // Default: in-app habilitado se não há preferência explícita desativando
    const inAppEnabled = inAppPref?.enabled !== false
    const emailEnabled = emailPref?.enabled === true

    // 4. Criar registro de notificação in-app no banco
    if (inAppEnabled) {
      const notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          channel: NotificationChannel.IN_APP,
          priority: params.priority ?? NotificationPriority.LOW,
          payload: {
            title: params.title,
            body: params.body,
            actionUrl: params.actionUrl,
            ...(params.metadata ?? {}),
          },
          projectId: params.projectId ?? null,
          isRead: false,
        },
      })

      // 5. Broadcast in-app via Supabase Realtime
      await InAppChannel.send(notification)
    }

    // 6. Enviar email se habilitado nas preferências
    if (emailEnabled) {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { email: true },
      })

      if (user?.email) {
        // Criar registro email separado para rastreabilidade
        const emailNotification = await prisma.notification.create({
          data: {
            userId: params.userId,
            type: params.type,
            channel: NotificationChannel.EMAIL,
            priority: params.priority ?? NotificationPriority.LOW,
            payload: {
              title: params.title,
              body: params.body,
              actionUrl: params.actionUrl,
            },
            projectId: params.projectId ?? null,
            isRead: true, // emails não têm estado "lido" in-app
          },
        })

        await EmailChannel.send(user.email, emailNotification)
      }
    }
  }

  /**
   * Retorna o número de notificações não lidas do usuário.
   * Util para badges e contadores.
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
        channel: NotificationChannel.IN_APP,
      },
    })
  }
}
