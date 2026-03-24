'use server'

import { prisma } from '@/lib/db'
import { requireServerUser } from '@/lib/auth/get-user'
import { withProjectAccess, requireFinancialAccess, hasRole } from '@/lib/rbac'
import { toActionError, AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import {
  CreateTimesheetEntrySchema,
  PatchTimesheetEntrySchema,
  ListTimesheetSchema,
} from '@/schemas/timesheet.schema'
import type { CreateTimesheetEntryInput, PatchTimesheetEntryInput } from '@/schemas/timesheet.schema'
import { UserRole } from '@prisma/client'
import { differenceInDays } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { getISOWeekStart, getISOWeekNumber } from '@/lib/utils/date-helpers'

const EDIT_WINDOW_DAYS = 7

// ── LIST TIMESHEET ENTRIES ─────────────────────────────────────────────────────

export async function getTimeEntries(params: {
  projectId: string
  startDate?: string
  endDate?: string
  week?: string
  userId?: string
  page?: number
  limit?: number
}) {
  try {
    const user = await requireServerUser()
    const input = ListTimesheetSchema.parse(params)
    await withProjectAccess(user.id, input.projectId)

    // RBAC: DEV e CLIENTE só veem os próprios entries
    const canSeeAll = hasRole(user.role, [UserRole.SOCIO, UserRole.PM])
    const effectiveUserId = canSeeAll ? (input.userId ?? undefined) : user.id

    // Filtro de semana ISO (opcional)
    let dateFilter: { workDate?: { gte: Date; lte: Date } } = {}
    if (input.week) {
      const [yearStr, weekStr] = input.week.split('-W')
      const year = Number(yearStr)
      const weekNum = Number(weekStr)
      const startOfWeek = getISOWeekStart(year, weekNum)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      dateFilter = { workDate: { gte: startOfWeek, lte: endOfWeek } }
    } else {
      if (input.startDate) {
        dateFilter.workDate = {
          ...(dateFilter.workDate ?? {}),
          gte: new Date(input.startDate),
        } as { gte: Date; lte: Date }
      }
      if (input.endDate) {
        dateFilter.workDate = {
          ...(dateFilter.workDate ?? {}),
          lte: new Date(input.endDate),
        } as { gte: Date; lte: Date }
      }
    }

    const skip = (input.page - 1) * input.limit
    const where = {
      projectId: input.projectId,
      deletedAt: null,
      ...(effectiveUserId ? { userId: effectiveUserId } : {}),
      ...dateFilter,
    }

    const [data, total] = await Promise.all([
      prisma.timesheetEntry.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, role: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
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

// ── LOG TIME (CREATE) ──────────────────────────────────────────────────────────

export async function logTime(input: CreateTimesheetEntryInput) {
  try {
    const user = await requireServerUser()
    const validated = CreateTimesheetEntrySchema.parse(input)
    await withProjectAccess(user.id, validated.projectId)

    // Validar data não futura
    const workDate = new Date(validated.workDate)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (workDate > today) {
      throw new AppError(ERROR_CODES.TS_051.code, ERROR_CODES.TS_051.message, 422)
    }

    // Validar múltiplo de 0.25
    if (validated.hours % 0.25 !== 0) {
      throw new AppError(ERROR_CODES.TS_055.code, ERROR_CODES.TS_055.message, 422)
    }

    // Validar taskId pertence ao projeto (se fornecido)
    if (validated.taskId) {
      const task = await prisma.task.findFirst({
        where: { id: validated.taskId, projectId: validated.projectId },
      })
      if (!task) {
        throw new AppError(ERROR_CODES.TS_080.code, 'Task não pertence a este projeto', 400)
      }
    }

    const data = await prisma.timesheetEntry.create({
      data: {
        projectId: validated.projectId,
        userId: user.id,
        taskId: validated.taskId ?? null,
        hours: validated.hours,
        role: user.role,
        workDate,
        description: validated.description ?? null,
        notes: validated.notes ?? null,
        billable: validated.billable,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
        task: { select: { id: true, title: true } },
      },
    })

    revalidatePath('/rentabilia')
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

// ── EDIT TIME ENTRY (PATCH) ────────────────────────────────────────────────────

export async function editTimeEntry(
  entryId: string,
  updates: PatchTimesheetEntryInput,
) {
  try {
    const user = await requireServerUser()
    const validated = PatchTimesheetEntrySchema.parse(updates)

    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: entryId },
    })
    if (!entry || entry.deletedAt) {
      throw new AppError(ERROR_CODES.TS_080.code, ERROR_CODES.TS_080.message, 404)
    }

    // Apenas o dono pode editar
    if (entry.userId !== user.id) {
      throw new AppError(ERROR_CODES.TS_054.code, ERROR_CODES.TS_054.message, 403)
    }

    // Janela de 7 dias
    const daysSinceCreation = differenceInDays(new Date(), entry.createdAt)
    if (daysSinceCreation > EDIT_WINDOW_DAYS) {
      throw new AppError(
        ERROR_CODES.TS_053.code,
        `Janela de edição de ${EDIT_WINDOW_DAYS} dias expirada. Este registro foi criado há ${daysSinceCreation} dias.`,
        422,
      )
    }

    const data = await prisma.timesheetEntry.update({
      where: { id: entryId },
      data: {
        ...(validated.hours !== undefined ? { hours: validated.hours } : {}),
        ...(validated.description !== undefined ? { description: validated.description } : {}),
        ...(validated.notes !== undefined ? { notes: validated.notes } : {}),
        ...(validated.billable !== undefined ? { billable: validated.billable } : {}),
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
        task: { select: { id: true, title: true } },
      },
    })

    revalidatePath('/rentabilia')
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

// ── DELETE TIME ENTRY (SOFT DELETE) ────────────────────────────────────────────

export async function deleteTimeEntry(entryId: string) {
  try {
    const user = await requireServerUser()

    const entry = await prisma.timesheetEntry.findUnique({ where: { id: entryId } })
    if (!entry || entry.deletedAt) {
      throw new AppError(ERROR_CODES.TS_080.code, ERROR_CODES.TS_080.message, 404)
    }

    await withProjectAccess(user.id, entry.projectId)

    // Apenas o dono pode deletar
    if (entry.userId !== user.id) {
      throw new AppError(ERROR_CODES.TS_054.code, ERROR_CODES.TS_054.message, 403)
    }

    // Janela de 7 dias (mesma do edit)
    const daysSinceCreation = differenceInDays(new Date(), entry.createdAt)
    if (daysSinceCreation > EDIT_WINDOW_DAYS) {
      throw new AppError(
        ERROR_CODES.TS_053.code,
        `Janela de exclusão de ${EDIT_WINDOW_DAYS} dias expirada.`,
        422,
      )
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

// ── TIMESHEET SUMMARY (aggregates) ────────────────────────────────────────────

export async function getTimesheetSummary(projectId: string, userId?: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId)

    const canSeeAll = hasRole(user.role, [UserRole.SOCIO, UserRole.PM])
    const effectiveUserId = canSeeAll ? (userId ?? undefined) : user.id

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = getISOWeekStart(now.getFullYear(), getISOWeekNumber(now))

    const baseWhere = {
      projectId,
      deletedAt: null,
      ...(effectiveUserId ? { userId: effectiveUserId } : {}),
    }

    const [weekEntries, monthEntries] = await Promise.all([
      prisma.timesheetEntry.findMany({
        where: { ...baseWhere, workDate: { gte: startOfWeek } },
        select: { hours: true, billable: true },
      }),
      prisma.timesheetEntry.findMany({
        where: { ...baseWhere, workDate: { gte: startOfMonth } },
        select: { hours: true, billable: true },
      }),
    ])

    const sumHours = (entries: { hours: unknown; billable: boolean }[]) => {
      let total = 0
      let billable = 0
      let nonBillable = 0
      for (const e of entries) {
        const h = Number(e.hours)
        total += h
        if (e.billable) billable += h
        else nonBillable += h
      }
      return { total, billable, nonBillable }
    }

    const weekStats = sumHours(weekEntries)
    const monthStats = sumHours(monthEntries)

    return {
      data: {
        weekHours: weekStats.total,
        monthHours: monthStats.total,
        totalHours: monthStats.total,
        billableHours: monthStats.billable,
        nonBillableHours: monthStats.nonBillable,
      },
    }
  } catch (error) {
    return toActionError(error)
  }
}

// ── RENTABILITY DASHBOARD (P&L preview) ────────────────────────────────────────

export async function getRentabilityDashboard(projectId: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId)
    requireFinancialAccess(user.role)

    // Buscar estimate do projeto (module-7)
    const estimate = await prisma.estimate.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { totalMin: true, totalMax: true },
    })

    if (!estimate) {
      return { data: { hasEstimate: false } }
    }

    // Buscar todas as entries para calcular custo
    const entries = await prisma.timesheetEntry.findMany({
      where: { projectId, deletedAt: null },
      include: { user: { select: { id: true, role: true } } },
    })

    // Importar CostResolver para calcular custo real
    const { CostResolver } = await import('@/lib/services/cost-resolver')
    const resolver = new CostResolver(projectId)

    let totalCost = 0
    let totalHours = 0
    let billableHours = 0

    for (const entry of entries) {
      const resolved = await resolver.resolveForEntry(
        {
          userId: entry.userId,
          hours: Number(entry.hours),
          billable: entry.billable,
        },
        entry.user.role,
      )
      totalCost += resolved.cost
      totalHours += Number(entry.hours)
      if (entry.billable) billableHours += Number(entry.hours)
    }

    const revenueMin = Number(estimate.totalMin)
    const revenueMax = Number(estimate.totalMax)
    const marginMin = revenueMin - totalCost
    const marginMax = revenueMax - totalCost
    const marginPctMin = revenueMin > 0 ? (marginMin / revenueMin) * 100 : 0
    const marginPctMax = revenueMax > 0 ? (marginMax / revenueMax) * 100 : 0

    return {
      data: {
        hasEstimate: true,
        revenueMin,
        revenueMax,
        totalCost,
        marginMin,
        marginMax,
        marginPctMin,
        marginPctMax,
        totalHours,
        billableHours,
      },
    }
  } catch (error) {
    return toActionError(error)
  }
}

// ── EXPORT TIMESHEET ───────────────────────────────────────────────────────────

export async function exportTimesheet(projectId: string, format: 'csv' | 'pdf') {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId)
    requireFinancialAccess(user.role)

    const entries = await prisma.timesheetEntry.findMany({
      where: { projectId, deletedAt: null },
      include: {
        user: { select: { name: true, role: true } },
        task: { select: { title: true } },
      },
      orderBy: [{ workDate: 'desc' }],
    })

    if (format === 'csv') {
      const header = 'Data,Usuário,Role,Horas,Faturável,Task,Descrição,Notas'
      const rows = entries.map((e: { workDate: Date; user: { name: string }; role: string; hours: unknown; billable: boolean; task?: { title: string } | null; description?: string | null; notes?: string | null }) =>
        [
          e.workDate.toISOString().split('T')[0],
          e.user.name,
          e.role,
          Number(e.hours).toFixed(2),
          e.billable ? 'Sim' : 'Não',
          e.task?.title ?? '',
          (e.description ?? '').replace(/,/g, ';'),
          (e.notes ?? '').replace(/,/g, ';'),
        ].join(','),
      )
      return { data: { format: 'csv', content: [header, ...rows].join('\n') } }
    }

    // PDF: retornar dados estruturados para o frontend renderizar
    return { data: { format: 'pdf', entries } }
  } catch (error) {
    return toActionError(error)
  }
}

