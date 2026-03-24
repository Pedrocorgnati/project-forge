// ─── SCOPE ALERT EVENT HANDLER ────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-1 / ST001
// Notifica PM/SOCIO via NotificationService ao criar novo ScopeAlert.
// Rastreabilidade: INT-066

import type { Event } from '@prisma/client'
import { EventType } from '@/lib/constants/events'
import { createLogger } from '@/lib/logger'

const log = createLogger('event-handlers/scope-alert')

type RegisterFn = (type: string, handler: (event: Event) => Promise<void>) => void

export function registerScopeAlertHandlers(register: RegisterFn): void {
  register(EventType.SCOPE_ALERT_CREATED, handleScopeAlertCreated)
}

export async function handleScopeAlertCreated(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    alertId: string
    taskId: string
    type: string
    severity: string
  }

  try {
    const { prisma } = await import('@/lib/db')
    const { NotificationService } = await import('@/lib/notifications/service')

    const members = await prisma.projectMember.findMany({
      where: { projectId: payload.projectId, role: { in: ['PM', 'SOCIO'] } },
    })

    const severityLabel: Record<string, string> = {
      HIGH: '🔴 Alta',
      MEDIUM: '🟡 Média',
      LOW: '🟢 Baixa',
    }
    const typeLabel: Record<string, string> = {
      SCOPE_CREEP: 'Scope Creep',
      OUT_OF_SCOPE: 'Fora do Escopo',
      DUPLICATE: 'Tarefa Duplicada',
    }

    const severity = severityLabel[payload.severity] ?? payload.severity
    const type = typeLabel[payload.type] ?? payload.type

    await Promise.all(
      members.map((m: { userId: string }) =>
        NotificationService.send({
          userId: m.userId,
          type: event.type,
          title: `${severity} — ${type} detectado`,
          body: `Uma nova tarefa foi classificada como "${type}". Verifique o ScopeShield para tomar ação.`,
          projectId: payload.projectId,
          actionUrl: `/projetos/${payload.projectId}/scope-alerts`,
        }),
      ),
    )
  } catch (err) {
    log.error({ err: String(err) }, '[ScopeAlertHandler] Falha ao notificar membros — ignorado')
  }
}
