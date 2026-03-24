import { Resend } from 'resend'
import { render } from '@react-email/render'
import type { Notification } from '@prisma/client'
import { EventType } from '@/lib/constants/events'
import { createElement } from 'react'
import { createLogger } from '@/lib/logger'

const log = createLogger('notifications/channels/email')

// React Email templates
import { BaseEmail } from '../templates/base'
import { ApprovalRequestEmail } from '../templates/approval-request'
import { ApprovalApprovedEmail } from '../templates/approval-approved'
import { ApprovalRejectedEmail } from '../templates/approval-rejected'
import { ScopeAlertEmail } from '../templates/scope-alert'
import { DeadlineReminderEmail } from '../templates/deadline-reminder'
import { ProjectUpdateEmail } from '../templates/project-update'

// ─── EMAIL NOTIFICATION CHANNEL ───────────────────────────────────────────────

/** Helper para extrair campo do payload JSON com fallback */
function getPayloadField<T>(notification: Notification, key: string, fallback: T): T {
  const payload = notification.payload as Record<string, unknown>
  return (payload?.[key] as T) ?? fallback
}

/**
 * Mapeia o tipo de evento + payload para o componente React Email correto.
 * Retorna { subject, element } onde element é o React element a ser renderizado.
 */
function getEmailElement(notification: Notification): { subject: string; element: React.ReactElement } {
  const payload = notification.payload as Record<string, unknown>
  const title = getPayloadField(notification, 'title', notification.type)
  const body = getPayloadField(notification, 'body', '')
  const actionUrl = getPayloadField<string>(notification, 'actionUrl', '')

  switch (notification.type) {
    case EventType.APPROVAL_REQUESTED:
      return {
        subject: `Solicitação de aprovação — ${title}`,
        element: createElement(ApprovalRequestEmail, {
          projectName: getPayloadField(notification, 'projectName', ''),
          documentTitle: getPayloadField(notification, 'documentTitle', title),
          requestedBy: getPayloadField(notification, 'requestedBy', ''),
          slaDeadline: getPayloadField(notification, 'slaDeadline', new Date().toISOString()),
          approvalUrl: getPayloadField(notification, 'approvalUrl', actionUrl),
        }),
      }

    case EventType.APPROVAL_SUBMITTED: {
      const decision = getPayloadField<string>(notification, 'decision', '')
      if (decision === 'APPROVED') {
        return {
          subject: `Decisão de aprovação — ${title}`,
          element: createElement(ApprovalApprovedEmail, {
            projectName: getPayloadField(notification, 'projectName', ''),
            documentTitle: getPayloadField(notification, 'documentTitle', title),
            approvedBy: getPayloadField(notification, 'approvedBy', ''),
            approvedAt: getPayloadField(notification, 'approvedAt', new Date().toISOString()),
            nextStepUrl: getPayloadField(notification, 'nextStepUrl', actionUrl),
          }),
        }
      }
      // REJECTED decision
      return {
        subject: `Ajustes solicitados — ${title}`,
        element: createElement(ApprovalRejectedEmail, {
          projectName: getPayloadField(notification, 'projectName', ''),
          documentTitle: getPayloadField(notification, 'documentTitle', title),
          rejectedBy: getPayloadField(notification, 'rejectedBy', ''),
          reason: getPayloadField<string | undefined>(notification, 'reason', undefined),
          projectUrl: getPayloadField(notification, 'projectUrl', actionUrl),
        }),
      }
    }

    case EventType.APPROVAL_EXPIRED:
      return {
        subject: `Prazo de aprovação expirado — ${title}`,
        element: createElement(ApprovalRejectedEmail, {
          projectName: getPayloadField(notification, 'projectName', ''),
          documentTitle: getPayloadField(notification, 'documentTitle', title),
          rejectedBy: 'Sistema (expiração automática)',
          reason: getPayloadField<string | undefined>(
            notification,
            'reason',
            'O prazo para aprovação expirou sem resposta.',
          ),
          projectUrl: getPayloadField(notification, 'projectUrl', actionUrl),
        }),
      }

    case EventType.SCOPE_ALERT_TRIGGERED:
      return {
        subject: `⚠️ Alerta de escopo — ${title}`,
        element: createElement(ScopeAlertEmail, {
          projectName: getPayloadField(notification, 'projectName', ''),
          taskName: getPayloadField(notification, 'taskName', title),
          plannedHours: getPayloadField(notification, 'plannedHours', 0),
          actualHours: getPayloadField(notification, 'actualHours', 0),
          deviationPct: getPayloadField(notification, 'deviationPct', 0),
          scopeUrl: getPayloadField(notification, 'scopeUrl', actionUrl),
        }),
      }

    case EventType.BRIEF_PRD_APPROVED:
      return {
        subject: `PRD aprovado — ${title}`,
        element: createElement(ProjectUpdateEmail, {
          projectName: getPayloadField(notification, 'projectName', ''),
          from: 'Em revisão',
          to: 'PRD Aprovado',
          updatedBy: getPayloadField(notification, 'approvedBy', ''),
          projectUrl: getPayloadField(notification, 'projectUrl', actionUrl),
        }),
      }

    case EventType.PROJECT_STATUS_CHANGED:
      return {
        subject: `Status atualizado — ${title}`,
        element: createElement(ProjectUpdateEmail, {
          projectName: getPayloadField(notification, 'projectName', ''),
          from: (payload?.from as string) ?? '',
          to: (payload?.to as string) ?? '',
          updatedBy: getPayloadField(notification, 'updatedBy', ''),
          projectUrl: getPayloadField(notification, 'projectUrl', actionUrl),
        }),
      }

    default:
      // Fallback genérico usando BaseEmail
      return {
        subject: title,
        element: createElement(BaseEmail, { previewText: title }, body),
      }
  }
}

/**
 * Renderiza a notificação em HTML usando React Email templates.
 */
async function renderEmailTemplate(
  notification: Notification,
): Promise<{ subject: string; html: string }> {
  const { subject, element } = getEmailElement(notification)
  const html = await render(element)
  return { subject, html }
}

/**
 * Canal de email via Resend SDK.
 * Falhas são capturadas e logadas — nunca propagam para o caller.
 */
export class EmailChannel {
  /**
   * Envia email transacional para o destinatário.
   *
   * @param to - Email do destinatário
   * @param notification - Registro de notificação com payload
   */
  static async send(to: string, notification: Notification): Promise<void> {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { subject, html } = await renderEmailTemplate(notification)

    try {
      await resend.emails.send({
        from: 'ProjectForge <noreply@projectforge.app>',
        to,
        subject,
        html,
      })
    } catch (error) {
      // Falha de email não propaga — registrar e continuar
      log.error(
        { to, type: notification.type, err: error instanceof Error ? error.message : String(error) },
        '[EmailChannel] Falha ao enviar email',
      )
    }
  }
}
