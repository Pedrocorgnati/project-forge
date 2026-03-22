'use server'

import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { withProjectAccess } from '@/lib/rbac'
import { toActionError, AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import { CreateTaskSchema, UpdateTaskSchema, RegisterScopeValidationSchema, ListTasksSchema } from '@/schemas/task.schema'
import { CreateChangeOrderSchema, ListChangeOrdersSchema } from '@/schemas/change-order.schema'
import type { CreateTaskInput, UpdateTaskInput, RegisterScopeValidationInput } from '@/schemas/task.schema'
import type { CreateChangeOrderInput } from '@/schemas/change-order.schema'
import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────

export async function getTasks(params: { projectId: string; status?: string; assigneeId?: string }) {
  try {
    const user = await getAuthUser()
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
    const user = await getAuthUser()
    const validated = CreateTaskSchema.parse(input)
    await withProjectAccess(user.id, validated.projectId, UserRole.DEV)

    const data = await prisma.task.create({
      data: {
        ...validated,
        // Emitir evento TASK_CREATED
      },
    })

    // TODO: Emitir evento TASK_CREATED via /auto-flow execute
    revalidatePath('/board')
    revalidatePath('/scopeshield')
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  try {
    const user = await getAuthUser()
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
    const user = await getAuthUser()

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
    const user = await getAuthUser()
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

    // TODO: Emitir evento SCOPE_ALERT se INVALID via /auto-flow execute

    revalidatePath('/scopeshield')
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function updateTaskStatus(taskId: string, status: string) {
  return updateTask(taskId, { status: status as never })
}

export async function detectScopeDeviation(taskId: string) {
  // TODO: Implementar via /auto-flow execute - comparar horas estimadas vs realizadas
  void taskId
  return { data: null }
}

// ─────────────────────────────────────────────
// CHANGE ORDERS
// ─────────────────────────────────────────────

export async function getChangeOrders(params: { projectId: string; status?: string }) {
  try {
    const user = await getAuthUser()
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
    const user = await getAuthUser()
    const validated = CreateChangeOrderSchema.parse(input)
    await withProjectAccess(user.id, validated.projectId, UserRole.PM)

    const { taskIds, ...changeOrderData } = validated

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

    // TODO: Emitir CHANGE_ORDER_CREATED via /auto-flow execute
    revalidatePath('/scopeshield')
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}
