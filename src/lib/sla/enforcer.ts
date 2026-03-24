// src/lib/sla/enforcer.ts
// module-17-clientportal-approvals / TASK-2 ST001b
// Lógica pura do SLA Enforcer: expiração e lembretes de aprovações pendentes
// Rastreabilidade: INT-107

import { isPast } from 'date-fns'
import { prisma } from '@/lib/db'
import { logApprovalHistory } from '@/lib/approvals/log-history'
import { EventBus } from '@/lib/events/bus'
import { EventType } from '@/lib/constants/events'
import { sendSLAReminderEmail } from '@/lib/email/send-sla-reminder'
import { sendApprovalExpiredEmail } from '@/lib/email/send-approval-expired'
import { shouldSendReminder } from './calculate-sla'

export interface SLAEnforcerResult {
  expired: number
  reminded: number
  errors: string[]
}

/**
 * Processa todas as aprovações PENDING:
 * 1. Expira as que passaram do slaDeadline
 * 2. Envia lembrete único quando restam 22-26h
 *
 * Falhas individuais são capturadas e acumuladas em result.errors —
 * o processamento continua para as demais aprovações.
 */
export async function runSLAEnforcer(): Promise<SLAEnforcerResult> {
  const result: SLAEnforcerResult = { expired: 0, reminded: 0, errors: [] }

  const pendingApprovals = await prisma.approvalRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      project: { select: { id: true, name: true } },
      requester: { select: { id: true, email: true, name: true } },
      clientAccess: { select: { clientEmail: true } },
      history: {
        where: { action: 'REMINDER_SENT' },
        take: 1,
      },
    },
  })

  for (const approval of pendingApprovals) {
    try {
      if (isPast(approval.slaDeadline)) {
        // ── 1. Expirar aprovação ──────────────────────────────────────────────
        await prisma.approvalRequest.update({
          where: { id: approval.id },
          data: { status: 'EXPIRED' },
        })

        await logApprovalHistory({
          approvalId: approval.id,
          action: 'EXPIRED',
          comment: 'SLA de 72 horas expirado sem resposta do cliente',
          actorId: undefined, // sistema — não há ator humano
        })

        await sendApprovalExpiredEmail({
          to: approval.requester.email,
          requesterName: approval.requester.name ?? 'Equipe',
          approvalTitle: approval.title,
          projectName: approval.project.name,
          projectId: approval.project.id,
          approvalId: approval.id,
          clientEmail: approval.clientAccess.clientEmail,
        })

        // Evento APPROVAL_EXPIRED (fire-and-forget)
        EventBus.publish(
          EventType.APPROVAL_EXPIRED,
          approval.project.id,
          { projectId: approval.project.id, approvalId: approval.id },
          'module-17-cron',
        ).catch((err: unknown) =>
          result.errors.push(`[event] ${approval.id}: ${String(err)}`),
        )

        result.expired++
        continue
      }

      // ── 2. Lembrete de 48h ────────────────────────────────────────────────
      const reminderAlreadySent = approval.history.length > 0
      if (!reminderAlreadySent && shouldSendReminder(approval.slaDeadline)) {
        await sendSLAReminderEmail({
          to: approval.clientAccess.clientEmail,
          approvalTitle: approval.title,
          projectName: approval.project.name,
          hoursRemaining: 24,
          approvalId: approval.id,
        })

        await logApprovalHistory({
          approvalId: approval.id,
          action: 'REMINDER_SENT',
          comment: 'Lembrete de 24h enviado ao cliente',
          // actorId: undefined — ação automática do sistema
        })

        result.reminded++
      }
    } catch (err) {
      result.errors.push(
        `Approval ${approval.id}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  return result
}
