'use server'

import { prisma } from '@/lib/db'
import { requireServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { toActionError, AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import { BriefService } from '@/lib/briefforge/brief-service'
import { BriefStatus } from '@/types/briefforge'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import type { Prisma } from '@prisma/client'

const UpdateBriefMetadataSchema = z.object({
  aiMetadata: z.record(z.string(), z.unknown()).optional(),
})

export async function getBrief(briefId: string) {
  try {
    const user = await requireServerUser()

    const brief = await prisma.brief.findUnique({
      where: { id: briefId },
      include: { project: { select: { id: true } } },
    })

    if (!brief) {
      throw new AppError(ERROR_CODES.BRIEF_080.code, ERROR_CODES.BRIEF_080.message, 404)
    }

    await withProjectAccess(user.id, brief.project.id)
    return { data: brief }
  } catch (error) {
    return toActionError(error)
  }
}

export async function getBriefByProject(projectId: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId)

    const brief = await prisma.brief.findUnique({
      where: { projectId },
      include: {
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          include: { questions: { orderBy: { order: 'asc' } } },
        },
      },
    })

    return { data: brief }
  } catch (error) {
    return toActionError(error)
  }
}

export async function updateBriefMetadata(briefId: string, input: unknown) {
  try {
    const user = await requireServerUser()
    const validated = UpdateBriefMetadataSchema.parse(input)

    const brief = await prisma.brief.findUnique({
      where: { id: briefId },
      include: { project: { select: { id: true } } },
    })

    if (!brief) {
      throw new AppError(ERROR_CODES.BRIEF_080.code, ERROR_CODES.BRIEF_080.message, 404)
    }

    await withProjectAccess(user.id, brief.project.id)

    const data = await prisma.brief.update({
      where: { id: briefId },
      data: {
        ...(validated.aiMetadata !== undefined
          ? { aiMetadata: validated.aiMetadata as Prisma.InputJsonValue }
          : {}),
      },
    })

    revalidatePath(`/briefforge/${brief.project.id}`)
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function createBriefForProject(projectId: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId)

    const existing = await prisma.brief.findUnique({ where: { projectId } })
    if (existing) {
      return { data: existing }
    }

    const brief = await BriefService.create({ projectId })
    revalidatePath(`/briefforge/${projectId}`)
    return { data: brief }
  } catch (error) {
    return toActionError(error)
  }
}

export async function isBriefCompleted(briefId: string) {
  try {
    const user = await requireServerUser()

    const brief = await prisma.brief.findUnique({
      where: { id: briefId },
      include: { project: { select: { id: true } } },
    })

    if (!brief) throw new AppError(ERROR_CODES.BRIEF_080.code, ERROR_CODES.BRIEF_080.message, 404)
    await withProjectAccess(user.id, brief.project.id)

    return { data: { completed: brief.status === BriefStatus.COMPLETED } }
  } catch (error) {
    return toActionError(error)
  }
}

/** @deprecated Use POST /api/briefs/[id]/sessions instead */
export async function startBriefSession(projectId: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId)

    const brief = await prisma.brief.upsert({
      where: { projectId },
      create: { projectId, status: BriefStatus.DRAFT },
      update: {},
    })

    return { data: brief }
  } catch (error) {
    return toActionError(error)
  }
}

/** @deprecated Use POST /api/briefs/[id]/sessions/[sessionId]/questions instead */
export async function answerBriefQuestion(briefId: string, answer: string) {
  void briefId; void answer
  throw new Error('Use POST /api/briefs/[id]/sessions/[sessionId]/questions para streaming SSE')
}

/** @deprecated Use module-6 PRD generation endpoint */
export async function generatePRD(briefId: string) {
  void briefId
  throw new Error('Use module-6 PRD generation endpoint')
}
