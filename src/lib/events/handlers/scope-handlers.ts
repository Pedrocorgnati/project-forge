import type { Event } from '@prisma/client'
import { EventType } from '@/lib/constants/events'
import type { EventHandler } from '../types'

async function getNotificationService() {
  const { NotificationService } = await import('@/lib/notifications/service')
  return NotificationService
}

// ─── SCOPE EVENT HANDLERS ─────────────────────────────────────────────────────

type RegisterFn = (type: string, handler: EventHandler) => void

export function registerScopeHandlers(register: RegisterFn): void {
  register(EventType.SCOPE_ALERT_TRIGGERED, handleScopeAlertTriggered)
  register(EventType.CHANGE_ORDER_CREATED, handleChangeOrderCreated)
  // CHANGE_ORDER_APPROVED e CHANGE_ORDER_REJECTED movidos para change-order-handler.ts (module-11)
}

export async function handleScopeAlertTriggered(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    deviation: number
    taskId: string
  }
  const NS = await getNotificationService()

  const { prisma } = await import('@/lib/db')
  const members = await prisma.projectMember.findMany({
    where: { projectId: payload.projectId, role: { in: ['PM', 'SOCIO'] } },
  })

  await Promise.all(
    members.map((m: { userId: string }) =>
      NS.send({
        userId: m.userId,
        type: event.type,
        title: `⚠️ Alerta de escopo — desvio de ${payload.deviation}%`,
        body: `Uma tarefa ultrapassou o escopo em ${payload.deviation}%. Verifique o ScopeShield.`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/scope`,
      }),
    ),
  )
}

export async function handleChangeOrderCreated(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    changeOrderId: string
    impactBRL: number
  }
  const NS = await getNotificationService()

  const { prisma } = await import('@/lib/db')
  const members = await prisma.projectMember.findMany({
    where: { projectId: payload.projectId, role: 'PM' },
  })

  await Promise.all(
    members.map((m: { userId: string }) =>
      NS.send({
        userId: m.userId,
        type: event.type,
        title: 'Nova ordem de mudança criada',
        body: `Ordem de mudança com impacto de R$ ${payload.impactBRL.toFixed(2)} criada e aguardando aprovação.`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/scope`,
      }),
    ),
  )
}

export async function handleChangeOrderApproved(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    changeOrderId: string
    approvedBy: string
  }
  const NS = await getNotificationService()

  const { prisma } = await import('@/lib/db')
  const members = await prisma.projectMember.findMany({
    where: { projectId: payload.projectId, role: 'PM' },
  })

  await Promise.all(
    members.map((m: { userId: string }) =>
      NS.send({
        userId: m.userId,
        type: event.type,
        title: 'Ordem de mudança aprovada',
        body: `Ordem de mudança aprovada por ${payload.approvedBy}.`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/scope`,
      }),
    ),
  )
}

export async function handleChangeOrderRejected(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    changeOrderId: string
    rejectedBy: string
  }
  const NS = await getNotificationService()

  const { prisma } = await import('@/lib/db')
  const members = await prisma.projectMember.findMany({
    where: { projectId: payload.projectId, role: 'PM' },
  })

  await Promise.all(
    members.map((m: { userId: string }) =>
      NS.send({
        userId: m.userId,
        type: event.type,
        title: 'Ordem de mudança rejeitada',
        body: `Ordem de mudança rejeitada por ${payload.rejectedBy}.`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/scope`,
      }),
    ),
  )
}
