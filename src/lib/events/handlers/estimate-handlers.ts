import type { Event } from '@prisma/client'
import { EventType } from '@/lib/constants/events'
import type { EventHandler } from '../types'

async function getNotificationService() {
  const { NotificationService } = await import('@/lib/notifications/service')
  return NotificationService
}

// ─── ESTIMATE EVENT HANDLERS ──────────────────────────────────────────────────

type RegisterFn = (type: string, handler: EventHandler) => void

export function registerEstimateHandlers(register: RegisterFn): void {
  register(EventType.ESTIMATE_CREATED, handleEstimateCreated)
  register(EventType.ESTIMATE_REVISED, handleEstimateRevised)
  register(EventType.ESTIMATE_APPROVED, handleEstimateApproved)
}

export async function handleEstimateCreated(event: Event): Promise<void> {
  const payload = event.payload as { projectId: string; estimateId: string; totalHours: number }
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
        title: 'Nova estimativa criada',
        body: `Estimativa de ${payload.totalHours}h criada. Revise e encaminhe para aprovação.`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/estimate`,
      }),
    ),
  )
}

export async function handleEstimateRevised(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    previousEstimateId: string
    newEstimateId: string
    reason: string
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
        title: 'Estimativa revisada',
        body: `Estimativa revisada: ${payload.reason}. Nova versão gerada automaticamente.`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/estimate`,
      }),
    ),
  )
}

export async function handleEstimateApproved(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    estimateId: string
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
        title: 'Estimativa aprovada',
        body: `Estimativa aprovada por ${payload.approvedBy}. Projeto pode avançar.`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/estimate`,
      }),
    ),
  )
}
