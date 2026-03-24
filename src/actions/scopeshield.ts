'use server'

import { prisma } from '@/lib/db'
import { requireServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { toActionError, AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import { EventBusClient } from '@/lib/events/event-bus-client'
import { EventType } from '@/lib/constants/events'
import { CreateTaskSchema, UpdateTaskSchema, RegisterScopeValidationSchema, ListTasksSchema } from '@/schemas/task.schema'
import { CreateChangeOrderSchema } from '@/lib/schemas/change-order'
import { ListChangeOrdersSchema } from '@/schemas/change-order.schema'
import type { CreateTaskInput, UpdateTaskInput, RegisterScopeValidationInput } from '@/schemas/task.schema'
import type { CreateChangeOrderInput } from '@/lib/schemas/change-order'
import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────

export async function getTasks(params: { projectId: string; status?: string; assigneeId?: string }) {
  try {
    const user = await requireServerUser()
    const input = ListTasksSchema.parse(params)
    await withProjectAccess(user.id, input.projectId)

    const data = await prisma.task.findMany({
      where: {
        projectId: input.projectId,
        ...(input.status ? { status: input.status as never } : {}),
        ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        scopeValidation: true,
        _count: { select: { timesheets: true } },
      },
      orderBy: { position: 'asc' },
    })

    return { data, total: data.length }
  } catch (error) {
    return toActionError(error)
  }
}

export async function createTask(input: CreateTaskInput) {
  try {
    const user = await requireServerUser()
    const validated = CreateTaskSchema.parse(input)
    await withProjectAccess(user.id, validated.projectId, UserRole.DEV)

    const data = await prisma.task.create({
      data: {
        ...validated,
        createdBy: user.id,
      },
    })

    // RESOLVED: DEBT-005
    try {
      await EventBusClient.publish(EventType.TASK_CREATED, validated.projectId, {
        taskId: data.id,
        createdBy: user.id,
      })
    } catch { /* evento não bloqueia fluxo principal */ }

    revalidatePath('/board')
    revalidatePath('/scopeshield')
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  try {
    const user = await requireServerUser()
    const validated = UpdateTaskSchema.parse(input)

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) throw new AppError(ERROR_CODES.TASK_080.code, ERROR_CODES.TASK_080.message, 404)

    const { projectRole } = await withProjectAccess(user.id, task.projectId)

    // DEV: apenas status. PM/SOCIO: tudo.
    const allowedFields: Partial<typeof validated> =
      projectRole === UserRole.DEV
        ? { status: validated.status }
        : validated

    const data = await prisma.task.update({
      where: { id: taskId },
      data: allowedFields,
    })

    revalidatePath('/board')
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function getTaskScope(taskId: string) {
  try {
    const user = await requireServerUser()

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) throw new AppError(ERROR_CODES.TASK_080.code, ERROR_CODES.TASK_080.message, 404)

    await withProjectAccess(user.id, task.projectId)

    const data = await prisma.scopeValidation.findUnique({ where: { taskId } })
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function registerScopeValidation(taskId: string, input: RegisterScopeValidationInput) {
  try {
    const user = await requireServerUser()
    const validated = RegisterScopeValidationSchema.parse(input)

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) throw new AppError(ERROR_CODES.TASK_080.code, ERROR_CODES.TASK_080.message, 404)

    await withProjectAccess(user.id, task.projectId, UserRole.PM)

    const data = await prisma.scopeValidation.upsert({
      where: { taskId },
      create: { taskId, ...validated },
      update: { ...validated },
    })

    // Atualizar scopeStatus na task
    await prisma.task.update({
      where: { id: taskId },
      data: { scopeStatus: validated.result },
    })

    // RESOLVED: DEBT-005
    if (validated.result === 'INVALID') {
      try {
        await EventBusClient.publish(EventType.SCOPE_ALERT_TRIGGERED, task.projectId, {
          projectId: task.projectId,
          deviation: Number(validated.similarityScore),
          taskId,
        })
      } catch { /* evento não bloqueia fluxo principal */ }
    }

    revalidatePath('/scopeshield')
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function updateTaskStatus(taskId: string, status: string) {
  return updateTask(taskId, { status: status as never })
}

// RESOLVED: DEBT-004
export async function detectScopeDeviation(taskId: string) {
  try {
    const user = await requireServerUser()

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) throw new AppError(ERROR_CODES.TASK_080.code, ERROR_CODES.TASK_080.message, 404)

    await withProjectAccess(user.id, task.projectId)

    const estimatedHours = Number(task.estimatedHours ?? 0)

    // Agregar horas reais dos timesheets vinculados a esta task
    const aggregate = await prisma.timesheetEntry.aggregate({
      where: { taskId, deletedAt: null },
      _sum: { hours: true },
    })
    const actualHours = Number(aggregate._sum.hours ?? 0)

    // Calcular desvio percentual
    const deviationPercent =
      estimatedHours > 0
        ? ((actualHours - estimatedHours) / estimatedHours) * 100
        : actualHours > 0
          ? 100
          : 0

    // Classificar status baseado nos thresholds
    const absDeviation = Math.abs(deviationPercent)
    const status: 'ON_TRACK' | 'WARNING' | 'OVER_SCOPE' =
      absDeviation < 10
        ? 'ON_TRACK'
        : absDeviation <= 25
          ? 'WARNING'
          : 'OVER_SCOPE'

    return {
      data: {
        taskId,
        estimatedHours,
        actualHours,
        deviationPercent: Math.round(deviationPercent * 100) / 100,
        status,
      },
    }
  } catch (error) {
    return toActionError(error)
  }
}

// ─────────────────────────────────────────────
// CHANGE ORDERS
// ─────────────────────────────────────────────

export async function getChangeOrders(params: { projectId: string; status?: string }) {
  try {
    const user = await requireServerUser()
    const input = ListChangeOrdersSchema.parse(params)
    await withProjectAccess(user.id, input.projectId)

    const data = await prisma.changeOrder.findMany({
      where: {
        projectId: input.projectId,
        ...(input.status ? { status: input.status as never } : {}),
      },
      include: {
        creator: { select: { id: true, name: true } },
        tasks: { include: { task: { select: { id: true, title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { data, total: data.length }
  } catch (error) {
    return toActionError(error)
  }
}

export async function createChangeOrder(input: CreateChangeOrderInput) {
  try {
    const user = await requireServerUser()
    const validated = CreateChangeOrderSchema.parse(input)
    await withProjectAccess(user.id, validated.projectId, UserRole.PM)

    const { affectedTaskIds: taskIds, ...changeOrderData } = validated

    const data = await prisma.changeOrder.create({
      data: {
        ...changeOrderData,
        createdBy: user.id,
        ...(taskIds?.length
          ? {
              tasks: {
                create: taskIds.map((taskId) => ({ taskId })),
              },
            }
          : {}),
      },
    })

    // RESOLVED: DEBT-005
    try {
      await EventBusClient.publish(EventType.CHANGE_ORDER_CREATED, validated.projectId, {
        projectId: validated.projectId,
        changeOrderId: data.id,
        impactBRL: Number(changeOrderData.impactHours ?? 0),
      })
    } catch { /* evento não bloqueia fluxo principal */ }

    revalidatePath('/scopeshield')
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}
