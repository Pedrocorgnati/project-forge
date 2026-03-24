import type { Event } from '@prisma/client'
import { EventType } from '@/lib/constants/events'
import type { EventHandler } from '../types'

async function getNotificationService() {
  const { NotificationService } = await import('@/lib/notifications/service')
  return NotificationService
}

// ─── PROJECT EVENT HANDLERS ───────────────────────────────────────────────────

type RegisterFn = (type: string, handler: EventHandler) => void

export function registerProjectHandlers(register: RegisterFn): void {
  register(EventType.PROJECT_CREATED, handleProjectCreated)
  register(EventType.PROJECT_STATUS_CHANGED, handleProjectStatusChanged)
}

export async function handleProjectCreated(event: Event): Promise<void> {
  const payload = event.payload as { projectId: string; createdBy: string }
  const NS = await getNotificationService()

  const { prisma } = await import('@/lib/db')
  const members = await prisma.projectMember.findMany({
    where: { projectId: payload.projectId },
  })

  await Promise.all(
    members
      .filter((m: { userId: string }) => m.userId !== payload.createdBy)
      .map((m: { userId: string }) =>
        NS.send({
          userId: m.userId,
          type: event.type,
          title: 'Novo projeto criado',
          body: 'Você foi adicionado a um novo projeto.',
          projectId: payload.projectId,
          actionUrl: `/projetos/${payload.projectId}`,
        }),
      ),
  )
}

export async function handleProjectStatusChanged(event: Event): Promise<void> {
  const payload = event.payload as { projectId: string; from: string; to: string }
  const NS = await getNotificationService()

  const { prisma } = await import('@/lib/db')
  const members = await prisma.projectMember.findMany({
    where: { projectId: payload.projectId },
  })

  await Promise.all(
    members.map((m: { userId: string }) =>
      NS.send({
        userId: m.userId,
        type: event.type,
        title: 'Status do projeto atualizado',
        body: `Status mudou de ${payload.from} para ${payload.to}.`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}`,
      }),
    ),
  )
}
