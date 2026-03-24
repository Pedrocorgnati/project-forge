// ─── CHANGE ORDER EVENT HANDLERS ─────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-1 (ST006)
// Handlers: CHANGE_ORDER_SUBMITTED, CHANGE_ORDER_APPROVED, CHANGE_ORDER_REJECTED
// Rastreabilidade: INT-072

import type { Event } from '@prisma/client'
import { EventType } from '@/lib/constants/events'
import type { EventHandler } from '@/lib/events/types'
import { createLogger } from '@/lib/logger'

const log = createLogger('event-handlers/change-order')

type RegisterFn = (type: string, handler: EventHandler) => void

export function registerChangeOrderHandlers(register: RegisterFn): void {
  register(EventType.CHANGE_ORDER_SUBMITTED, handleChangeOrderSubmitted)
  register(EventType.CHANGE_ORDER_APPROVED, handleChangeOrderApproved)
  register(EventType.CHANGE_ORDER_REJECTED, handleChangeOrderRejected)
}

// ─── SUBMITTED: notifica todos os SOCIOs do projeto ──────────────────────────

export async function handleChangeOrderSubmitted(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    changeOrderId: string
    title: string
    impactHours: number
    requestedBy: string
  }

  try {
    const { prisma } = await import('@/lib/db')
    const { NotificationService } = await import('@/lib/notifications/service')

    const socios = await prisma.projectMember.findMany({
      where: { projectId: payload.projectId, role: 'SOCIO' },
      select: { userId: true },
    })

    await Promise.all(
      socios.map((m: { userId: string }) =>
        NotificationService.send({
          userId: m.userId,
          type: event.type,
          title: '📋 Change Order Pendente de Aprovação',
          body: `"${payload.title}" requer aprovação. Impacto: +${payload.impactHours}h`,
          projectId: payload.projectId,
          actionUrl: `/projetos/${payload.projectId}/change-orders/${payload.changeOrderId}`,
        }),
      ),
    )
  } catch (err) {
    log.error({ err }, '[handleChangeOrderSubmitted] Erro ao notificar SOCIOs')
  }
}

// ─── APPROVED: recomputa totalHours via ImpactCalculator + notifica PM ───────

export async function handleChangeOrderApproved(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    changeOrderId: string
    approvedBy: string
    impactHours: number
    impactCost: number
    requestedBy: string
  }

  try {
    const { prisma } = await import('@/lib/db')
    const { NotificationService } = await import('@/lib/notifications/service')
    const { ImpactCalculator } = await import('@/lib/services/impact-calculator')

    // Delegar recompute ao ImpactCalculator (GAP-015)
    const calculator = new ImpactCalculator()
    await calculator.applyApprovedImpact(payload.projectId)

    // Buscar título da CO para notificação
    const co = await prisma.changeOrder.findUnique({
      where: { id: payload.changeOrderId },
      select: { title: true },
    })

    // Notificar o PM que criou a CO
    if (payload.requestedBy) {
      await NotificationService.send({
        userId: payload.requestedBy,
        type: event.type,
        title: '✅ Change Order Aprovada',
        body: `"${co?.title}" foi aprovada. +${payload.impactHours}h adicionadas ao projeto.`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/change-orders/${payload.changeOrderId}`,
      })
    }
  } catch (err) {
    log.error({ err }, '[handleChangeOrderApproved] Erro ao processar aprovação')
  }
}

// ─── REJECTED: notifica PM com motivo ────────────────────────────────────────

export async function handleChangeOrderRejected(event: Event): Promise<void> {
  const payload = event.payload as {
    projectId: string
    changeOrderId: string
    rejectedBy: string
    reason: string
    requestedBy: string
  }

  try {
    const { prisma } = await import('@/lib/db')
    const { NotificationService } = await import('@/lib/notifications/service')

    const co = await prisma.changeOrder.findUnique({
      where: { id: payload.changeOrderId },
      select: { title: true },
    })

    if (payload.requestedBy) {
      await NotificationService.send({
        userId: payload.requestedBy,
        type: event.type,
        title: '❌ Change Order Rejeitada',
        body: `"${co?.title}" foi rejeitada. Motivo: ${payload.reason}`,
        projectId: payload.projectId,
        actionUrl: `/projetos/${payload.projectId}/change-orders/${payload.changeOrderId}`,
      })
    }
  } catch (err) {
    log.error({ err }, '[handleChangeOrderRejected] Erro ao notificar PM')
  }
}
