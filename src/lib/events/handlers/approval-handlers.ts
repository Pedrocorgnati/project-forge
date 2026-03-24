import type { Event } from '@prisma/client'
import { EventType } from '@/lib/constants/events'
import type { EventHandler } from '../types'

async function getNotificationService() {
  const { NotificationService } = await import('@/lib/notifications/service')
  return NotificationService
}

// ─── APPROVAL EVENT HANDLERS ──────────────────────────────────────────────────

type RegisterFn = (type: string, handler: EventHandler) => void

export function registerApprovalHandlers(register: RegisterFn): void {
  register(EventType.APPROVAL_REQUESTED, handleApprovalRequested)
  register(EventType.APPROVAL_SUBMITTED, handleApprovalSubmitted)
  register(EventType.APPROVAL_EXPIRED, handleApprovalExpired)
}

/**
 * APPROVAL_REQUESTED → notificar PM que aprovação foi solicitada ao cliente.
 */
export async function handleApprovalRequested(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    approvalId: string
    expiresAt: string
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
        title: 'Aprovação solicitada ao cliente',
        body: `Documento enviado para aprovação. Prazo: ${new Date(payload.expiresAt).toLocaleDateString('pt-BR')}.`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/approvals/${payload.approvalId}`,
      }),
    ),
  )
}

/**
 * APPROVAL_SUBMITTED → notificar PM com a decisão do cliente.
 */
export async function handleApprovalSubmitted(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    approvalId: string
    decision: 'APPROVED' | 'REJECTED'
  }
  const NS = await getNotificationService()

  const { prisma } = await import('@/lib/db')
  const members = await prisma.projectMember.findMany({
    where: { projectId: payload.projectId, role: 'PM' },
  })

  const isApproved = payload.decision === 'APPROVED'

  await Promise.all(
    members.map((m: { userId: string }) =>
      NS.send({
        userId: m.userId,
        type: event.type,
        title: isApproved ? '✅ Cliente aprovou o documento' : '❌ Cliente rejeitou o documento',
        body: isApproved
          ? 'O cliente aprovou o documento. Pode prosseguir com a próxima etapa.'
          : 'O cliente rejeitou o documento. Verifique os comentários e faça os ajustes necessários.',
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/approvals/${payload.approvalId}`,
      }),
    ),
  )
}

/**
 * APPROVAL_EXPIRED → notificar PM que prazo expirou.
 */
export async function handleApprovalExpired(event: Event): Promise<void> {
  const payload = event.payload as { projectId: string; approvalId: string }
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
        title: 'Prazo de aprovação expirado',
        body: 'O prazo de aprovação do cliente expirou. Entre em contato para reagendar.',
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/approvals/${payload.approvalId}`,
      }),
    ),
  )
}
