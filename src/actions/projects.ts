'use server'

import { prisma } from '@/lib/db'
import { requireServerUser } from '@/lib/auth/get-user'
import { withProjectAccess, requireFinancialAccess, canAssignRole } from '@/lib/rbac'
import { toActionError, AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  AddProjectMemberSchema,
  ListProjectsSchema,
} from '@/schemas/project.schema'
import type { CreateProjectInput, UpdateProjectInput, AddProjectMemberInput } from '@/schemas/project.schema'
import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function getProjects(params?: Partial<{ status: string; page: number; limit: number }>) {
  try {
    const user = await requireServerUser()
    const input = ListProjectsSchema.parse(params ?? {})
    const skip = (input.page - 1) * input.limit

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where: {
          organizationId: user.organizationId,
          members: { some: { userId: user.id } },
          ...(input.status ? { status: input.status as never } : {}),
        },
        include: {
          members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: input.limit,
      }),
      prisma.project.count({
        where: {
          organizationId: user.organizationId,
          members: { some: { userId: user.id } },
          ...(input.status ? { status: input.status as never } : {}),
        },
      }),
    ])

    return { data, total, page: input.page, limit: input.limit }
  } catch (error) {
    return toActionError(error)
  }
}

export async function getProject(id: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, id)

    const data = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } } },
        },
        brief: true,
        _count: { select: { tasks: true, documents: true, changeOrders: true } },
      },
    })

    if (!data) {
      throw new AppError(ERROR_CODES.PROJECT_080.code, ERROR_CODES.PROJECT_080.message, 404)
    }

    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function createProject(input: CreateProjectInput) {
  try {
    const user = await requireServerUser()
    const validated = CreateProjectSchema.parse(input)

    // Apenas SOCIO e PM criam projetos
    if (!([UserRole.SOCIO, UserRole.PM] as UserRole[]).includes(user.role)) {
      throw new AppError(ERROR_CODES.AUTH_003.code, ERROR_CODES.AUTH_003.message, 403)
    }

    const slug = generateSlug(validated.name)

    const data = await prisma.project.create({
      data: {
        ...validated,
        slug,
        organizationId: user.organizationId,
        members: {
          create: { userId: user.id, role: user.role },
        },
      },
    })

    revalidatePath('/projetos')
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  try {
    const user = await requireServerUser()
    const { projectRole } = await withProjectAccess(user.id, id, UserRole.PM)
    void projectRole
    const validated = UpdateProjectSchema.parse(input)

    const data = await prisma.project.update({
      where: { id },
      data: validated,
    })

    revalidatePath('/projetos')
    revalidatePath(`/projetos/${id}`)
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

// RESOLVED: DEBT-002
export async function getProjectPnL(projectId: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId)
    requireFinancialAccess(user.role)

    const HOURLY_RATE = Number(process.env.HOURLY_RATE_BRL ?? '210')

    // 1. Estimated hours from tasks + approved change orders
    const [tasks, changeOrders, entries] = await Promise.all([
      prisma.task.findMany({
        where: { projectId },
        select: { estimatedHours: true },
      }),
      prisma.changeOrder.findMany({
        where: { projectId, status: 'APPROVED' },
        select: { hoursImpact: true },
      }),
      prisma.timesheetEntry.findMany({
        where: { projectId, deletedAt: null },
        include: { user: { select: { id: true, role: true } } },
      }),
    ])

    const estimatedHours = tasks.reduce(
      (sum: number, t: { estimatedHours?: unknown }) => sum + (t.estimatedHours ? Number(t.estimatedHours) : 0),
      0,
    )
    const changeOrderHours = changeOrders.reduce(
      (sum: number, co: { hoursImpact: unknown }) => sum + Number(co.hoursImpact),
      0,
    )
    const totalEstimatedHours = estimatedHours + changeOrderHours

    // 2. Revenue = estimated total * hourly rate
    const revenue = totalEstimatedHours * HOURLY_RATE

    // 3. Cost = actual hours * resolved rate per entry (via CostResolver)
    const { CostResolver } = await import('@/lib/services/cost-resolver')
    const resolver = new CostResolver(projectId)

    let totalCost = 0
    let totalActualHours = 0
    let billableHours = 0
    let nonBillableHours = 0

    for (const entry of entries) {
      const hours = Number(entry.hours)
      const resolved = await resolver.resolveForEntry(
        { userId: entry.userId, hours, billable: entry.billable },
        entry.user.role,
      )
      totalCost += resolved.cost
      totalActualHours += hours
      if (entry.billable) billableHours += hours
      else nonBillableHours += hours
    }

    // 4. Margin
    const margin = revenue - totalCost
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0

    return {
      data: {
        estimatedHours: totalEstimatedHours,
        changeOrderHours,
        actualHours: totalActualHours,
        billableHours,
        nonBillableHours,
        hourlyRate: HOURLY_RATE,
        revenue,
        cost: totalCost,
        margin,
        marginPct: Math.round(marginPct * 100) / 100,
      },
    }
  } catch (error) {
    return toActionError(error)
  }
}

export async function getProjectMembers(projectId: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId)

    const data = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      },
    })

    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function addProjectMember(projectId: string, input: AddProjectMemberInput) {
  try {
    const user = await requireServerUser()
    const { projectRole } = await withProjectAccess(user.id, projectId, UserRole.PM)

    const validated = AddProjectMemberSchema.parse(input)

    if (!canAssignRole(projectRole, validated.role)) {
      throw new AppError(ERROR_CODES.AUTH_003.code, 'Você não pode atribuir um role superior ao seu.', 403)
    }

    const data = await prisma.projectMember.create({
      data: {
        projectId,
        userId: validated.userId,
        role: validated.role,
      },
    })

    revalidatePath(`/projetos/${projectId}`)
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function removeProjectMember(projectId: string, userId: string) {
  try {
    const user = await requireServerUser()
    const { projectRole } = await withProjectAccess(user.id, projectId, UserRole.PM)
    void projectRole

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    })

    revalidatePath(`/projetos/${projectId}`)
    return { success: true }
  } catch (error) {
    return toActionError(error)
  }
}
