import type { Event } from '@prisma/client'
import { EventType } from '@/lib/constants/events'
import type { EventHandler } from '../types'

// ─── BRIEF EVENT HANDLERS ─────────────────────────────────────────────────────

type RegisterFn = (type: string, handler: EventHandler) => void

export function registerBriefHandlers(register: RegisterFn): void {
  register(EventType.BRIEF_PRD_GENERATED, handleBriefPrdGenerated)
  register(EventType.BRIEF_PRD_APPROVED, handleBriefPrdApproved)
  register(EventType.BRIEF_PRD_REJECTED, handleBriefPrdRejected)
  register(EventType.BRIEF_SESSION_COMPLETED, handleBriefSessionCompleted)
}

/**
 * Importação lazy do NotificationService para evitar dependência circular.
 * NUNCA importar no topo do arquivo.
 */
async function getNotificationService() {
  const { NotificationService } = await import('@/lib/notifications/service')
  return NotificationService
}

/**
 * BRIEF_PRD_GENERATED → notificar PM e SOCIO que PRD foi gerado com sucesso.
 */
export async function handleBriefPrdGenerated(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    prdVersion: number
    briefId: string
    prdDocumentId: string
    generatedBy: string
  }
  const NS = await getNotificationService()

  const { prisma } = await import('@/lib/db')
  const project = await prisma.project.findUnique({
    where: { id: payload.projectId },
    select: { name: true },
  })
  const projectName = project?.name ?? 'Projeto'

  // Buscar membros PM e SOCIO do projeto
  const members = await prisma.projectMember.findMany({
    where: { projectId: payload.projectId, role: { in: ['PM', 'SOCIO'] } },
    include: { user: true },
  })

  await Promise.all(
    members.map((m: { userId: string }) =>
      NS.send({
        userId: m.userId,
        type: event.type,
        title: 'PRD gerado com sucesso',
        body: `O PRD do projeto "${projectName}" (versão ${payload.prdVersion}) está pronto para revisão.`,
        projectId: payload.projectId,
        actionUrl: `/briefforge/${payload.projectId}/prd`,
      }),
    ),
  )
}

/**
 * BRIEF_PRD_APPROVED → notificar PM que PRD foi aprovado.
 */
export async function handleBriefPrdApproved(event: Event): Promise<void> {
  const payload = event.payload as { projectId: string; approvedBy: string; prdVersion: number }
  const NS = await getNotificationService()

  // Buscar membros PM do projeto
  const { prisma } = await import('@/lib/db')
  const members = await prisma.projectMember.findMany({
    where: { projectId: payload.projectId, role: 'PM' },
    include: { user: true },
  })

  await Promise.all(
    members.map((m: { userId: string }) =>
      NS.send({
        userId: m.userId,
        type: event.type,
        title: 'PRD aprovado',
        body: `O PRD versão ${payload.prdVersion} foi aprovado por ${payload.approvedBy}.`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/brief`,
      }),
    ),
  )
}

/**
 * BRIEF_PRD_REJECTED → notificar PM que PRD foi rejeitado.
 */
export async function handleBriefPrdRejected(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    rejectedBy: string
    reason: string
  }
  const NS = await getNotificationService()

  const { prisma } = await import('@/lib/db')
  const members = await prisma.projectMember.findMany({
    where: { projectId: payload.projectId, role: 'PM' },
    include: { user: true },
  })

  await Promise.all(
    members.map((m: { userId: string }) =>
      NS.send({
        userId: m.userId,
        type: event.type,
        title: 'PRD rejeitado',
        body: `PRD rejeitado por ${payload.rejectedBy}. Motivo: ${payload.reason}`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/brief`,
      }),
    ),
  )
}

/**
 * BRIEF_SESSION_COMPLETED → lembrar PM de revisar sessão.
 */
export async function handleBriefSessionCompleted(event: Event): Promise<void> {
  const payload = event.payload as { projectId: string; sessionId: string }
  const NS = await getNotificationService()

  const { prisma } = await import('@/lib/db')
  const members = await prisma.projectMember.findMany({
    where: { projectId: payload.projectId, role: 'PM' },
    include: { user: true },
  })

  await Promise.all(
    members.map((m: { userId: string }) =>
      NS.send({
        userId: m.userId,
        type: event.type,
        title: 'Sessão de briefing concluída',
        body: 'Uma sessão de briefing foi concluída. Revise as respostas e avance para o PRD.',
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/brief`,
      }),
    ),
  )
}
