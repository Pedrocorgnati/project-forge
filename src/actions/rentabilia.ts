'use server'

import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { withProjectAccess, requireFinancialAccess } from '@/lib/rbac'
import { toActionError, AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import { CreateTimesheetEntrySchema, ListTimesheetSchema } from '@/schemas/timesheet.schema'
import type { CreateTimesheetEntryInput } from '@/schemas/timesheet.schema'
import { revalidatePath } from 'next/cache'

export async function getTimeEntries(params: {
  projectId: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}) {
  try {
    const user = await getAuthUser()
    const input = ListTimesheetSchema.parse(params)
    await withProjectAccess(user.id, input.projectId)

    const skip = (input.page - 1) * input.limit
    const where = {
      projectId: input.projectId,
      deletedAt: null,
      ...(input.startDate ? { workDate: { gte: new Date(input.startDate) } } : {}),
      ...(input.endDate ? { workDate: { lte: new Date(input.endDate) } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.timesheetEntry.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: { workDate: 'desc' },
        skip,
        take: input.limit,
      }),
      prisma.timesheetEntry.count({ where }),
    ])

    return { data, total, page: input.page, limit: input.limit }
  } catch (error) {
    return toActionError(error)
  }
}

export async function logTime(input: CreateTimesheetEntryInput) {
  try {
    const user = await getAuthUser()
    const validated = CreateTimesheetEntrySchema.parse(input)
    await withProjectAccess(user.id, validated.projectId)

    // Validar data não futura
    const workDate = new Date(validated.workDate)
    if (workDate > new Date()) {
      throw new AppError(ERROR_CODES.TS_051.code, ERROR_CODES.TS_051.message, 422)
    }

    const data = await prisma.timesheetEntry.create({
      data: {
        ...validated,
        workDate,
        userId: user.id,
      },
    })

    // TODO: Emitir TIMESHEET_SUBMITTED via /auto-flow execute
    revalidatePath('/rentabilia')
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function deleteTimeEntry(entryId: string) {
  try {
    const user = await getAuthUser()

    const entry = await prisma.timesheetEntry.findUnique({ where: { id: entryId } })
    if (!entry || entry.deletedAt) {
      throw new AppError(ERROR_CODES.TS_080.code, ERROR_CODES.TS_080.message, 404)
    }

    await withProjectAccess(user.id, entry.projectId)

    // Verificar prazo de undo (24h)
    const diffMs = Date.now() - entry.createdAt.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    if (diffHours > 24) {
      throw new AppError(ERROR_CODES.TS_052.code, ERROR_CODES.TS_052.message, 422)
    }

    await prisma.timesheetEntry.update({
      where: { id: entryId },
      data: { deletedAt: new Date() },
    })

    revalidatePath('/rentabilia')
    return { success: true }
  } catch (error) {
    return toActionError(error)
  }
}

export async function getRentabilityDashboard(projectId: string) {
  try {
    const user = await getAuthUser()
    await withProjectAccess(user.id, projectId)
    requireFinancialAccess(user.role)

    // TODO: Implementar cálculo de rentabilidade via /auto-flow execute
    return { data: null }
  } catch (error) {
    return toActionError(error)
  }
}

export async function exportTimesheet(projectId: string, format: 'csv' | 'pdf') {
  // TODO: Implementar via /auto-flow execute
  void projectId; void format
  throw new Error('Not implemented - run /auto-flow execute')
}
