'use server'

import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { withProjectAccess } from '@/lib/rbac'
import { toActionError, AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import type { Prisma } from '@prisma/client'

const UpdateBriefSchema = z.object({
  answers: z.record(z.string(), z.unknown()).optional(),
  aiContext: z.record(z.string(), z.unknown()).optional(),
  isComplete: z.boolean().optional(),
})

export async function getBrief(briefId: string) {
  try {
    const user = await getAuthUser()

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

export async function updateBrief(briefId: string, input: unknown) {
  try {
    const user = await getAuthUser()
    const validated = UpdateBriefSchema.parse(input)

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
        ...(validated.answers ? { answers: validated.answers as Prisma.InputJsonValue } : {}),
        ...(validated.aiContext ? { aiContext: validated.aiContext as Prisma.InputJsonValue } : {}),
        ...(validated.isComplete !== undefined ? { isComplete: validated.isComplete } : {}),
      },
    })

    revalidatePath(`/briefforge/${brief.project.id}`)
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function startBriefSession(projectId: string) {
  // TODO: Implementar via /auto-flow execute - integração Claude CLI
  try {
    const user = await getAuthUser()
    await withProjectAccess(user.id, projectId)

    // Garante que o brief existe para o projeto
    const brief = await prisma.brief.upsert({
      where: { projectId },
      create: { projectId, answers: {}, aiContext: {} },
      update: {},
    })

    return { data: brief }
  } catch (error) {
    return toActionError(error)
  }
}

export async function answerBriefQuestion(briefId: string, answer: string) {
  // TODO: Implementar via /auto-flow execute - streaming Claude CLI
  void briefId; void answer
  throw new Error('Not implemented - run /auto-flow execute')
}

export async function generatePRD(briefId: string) {
  // TODO: Implementar via /auto-flow execute - gerar PRD via Claude CLI
  void briefId
  throw new Error('Not implemented - run /auto-flow execute')
}
