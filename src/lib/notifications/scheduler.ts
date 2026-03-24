import { prisma } from '@/lib/db'
import { NotificationService } from './service'
import { EventType } from '@/lib/constants/events'
import { ROUTES } from '@/lib/constants/routes'

// ─── NOTIFICATION SCHEDULER ───────────────────────────────────────────────────

/**
 * Scheduler de notificações baseadas em tempo.
 * Chamado via GET /api/scheduler (protegido por CRON_SECRET).
 * Idempotente: rodar múltiplas vezes na mesma hora não duplica lembretes.
 */
export class NotificationScheduler {
  /**
   * Verifica aprovações expirando nas próximas 24h e envia lembrete.
   * Não reenvia se lembrete já foi enviado nas últimas 12h.
   *
   * @returns Número de lembretes enviados
   */
  static async checkExpiringApprovals(): Promise<number> {
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const expiringApprovals = await prisma.approvalRequest.findMany({
      where: {
        status: 'PENDING',
        slaDeadline: { lte: in24h, gte: new Date() },
      },
      include: {
        project: { select: { name: true } },
        clientAccess: { select: { id: true, clientEmail: true, supabaseId: true } },
      },
    })

    let sent = 0

    for (const approval of expiringApprovals) {
      // Verificar se já enviamos lembrete nas últimas 12h
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)

      // Clientes externos (sem supabaseId) recebem notificação por email somente
      // Clientes com supabaseId recebem notificação in-app se tiverem User record
      const clientUserId = approval.clientAccess.supabaseId

      if (clientUserId) {
        const recentReminder = await prisma.notification.findFirst({
          where: {
            userId: clientUserId,
            type: EventType.APPROVAL_REQUESTED,
            projectId: approval.projectId,
            createdAt: { gte: twelveHoursAgo },
          },
        })

        if (recentReminder) continue

        await NotificationService.send({
          userId: clientUserId,
          type: EventType.APPROVAL_REQUESTED,
          title: `Aprovação expirando em breve — ${approval.project.name}`,
          body: `Você tem uma solicitação de aprovação expirando em menos de 24 horas.`,
          projectId: approval.projectId,
          actionUrl: ROUTES.PORTAL_APPROVAL(approval.projectId, approval.id),
        })
      } else {
        // Cliente sem User record — enviar email diretamente via EmailChannel
        const { EmailChannel } = await import('./channels/email')
        const { EmailQueue } = await import('./email-queue')

        const subject = `Aprovação expirando em breve — ${approval.project.name}`
        const canSend = await EmailQueue.enqueue({
          to: approval.clientAccess.clientEmail,
          type: EventType.APPROVAL_REQUESTED,
          projectId: approval.projectId,
          subject,
        })

        if (canSend) {
          // Criar notificação fictícia para o EmailChannel
          const fakeNotification = {
            id: approval.id,
            userId: '',
            projectId: approval.projectId,
            type: EventType.APPROVAL_REQUESTED,
            channel: 'EMAIL' as const,
            priority: 'HIGH' as const,
            payload: {
              title: subject,
              body: 'Você tem uma solicitação de aprovação expirando em menos de 24 horas.',
              actionUrl: ROUTES.PORTAL_APPROVAL(approval.projectId, approval.id),
            },
            isRead: false,
            groupedId: null,
            readAt: null,
            createdAt: new Date(),
          }
          await EmailChannel.send(
            approval.clientAccess.clientEmail,
            fakeNotification as never,
          )
        }
      }

      sent++
    }

    return sent
  }

  /**
   * Verifica deadlines de milestone nos próximos 3 dias.
   * Aguarda implementação do ScopeShield Board (module-9).
   *
   * @returns 0 (stub)
   */
  static async checkUpcomingDeadlines(): Promise<number> {
    // Implementar quando module-9 (ScopeShield Board) estiver disponível
    return 0
  }

  /**
   * Executa todos os checks do scheduler em paralelo.
   * Entry point para o cron job.
   */
  static async runAll(): Promise<{ approvals: number; deadlines: number }> {
    const [approvals, deadlines] = await Promise.all([
      NotificationScheduler.checkExpiringApprovals(),
      NotificationScheduler.checkUpcomingDeadlines(),
    ])
    return { approvals, deadlines }
  }
}
