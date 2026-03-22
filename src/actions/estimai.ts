'use server'

import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { withProjectAccess } from '@/lib/rbac'
import { toActionError } from '@/lib/errors'
import { CreateEstimateSchema } from '@/schemas/estimate.schema'
import type { CreateEstimateInput } from '@/schemas/estimate.schema'
import type { Prisma } from '@prisma/client'
import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function getEstimates(projectId: string) {
  try {
    const user = await getAuthUser()
    await withProjectAccess(user.id, projectId)

    const data = await prisma.estimate.findMany({
      where: { projectId },
      include: {
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { data, total: data.length }
  } catch (error) {
    return toActionError(error)
  }
}

export async function createEstimate(input: CreateEstimateInput) {
  try {
    const user = await getAuthUser()
    const validated = CreateEstimateSchema.parse(input)
    await withProjectAccess(user.id, validated.projectId, UserRole.PM)

    const data = await prisma.estimate.create({
      data: {
        ...validated,
        createdBy: user.id,
        stackTags: validated.stackTags,
        breakdown: (validated.breakdown ?? {}) as Prisma.InputJsonValue,
      },
    })

    revalidatePath(`/estimai`)
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function generateEstimate(projectId: string) {
  // TODO: Implementar via /auto-flow execute - Claude CLI gera estimativa baseada no PRD
  void projectId
  throw new Error('Not implemented - run /auto-flow execute')
}

export async function approveEstimate(estimateId: string) {
  try {
    const user = await getAuthUser()

    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
    })

    if (!estimate) return { error: 'Estimativa não encontrada' }

    await withProjectAccess(user.id, estimate.projectId, UserRole.SOCIO)

    const data = await prisma.estimate.update({
      where: { id: estimateId },
      data: { status: 'APPROVED' },
    })

    revalidatePath('/estimai')
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}
