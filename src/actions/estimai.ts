'use server'

import { prisma } from '@/lib/db'
import { requireServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { toActionError } from '@/lib/errors'
import { EstimationEngine } from '@/lib/services/estimation-engine'
import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('actions/estimai')

// ─── ESTIMAI SERVER ACTIONS ───────────────────────────────────────────────────

export async function getEstimates(projectId: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId)

    const data = await prisma.estimate.findMany({
      where: { projectId },
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { items: true, versions: true } },
      },
      orderBy: { version: 'desc' },
    })

    return { data, total: data.length }
  } catch (error) {
    return toActionError(error)
  }
}

export async function getEstimateDetail(estimateId: string, projectId: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId)

    const data = await prisma.estimate.findUnique({
      where: { id: estimateId, projectId },
      include: {
        items: { orderBy: { category: 'asc' } },
        versions: {
          orderBy: { version: 'desc' },
          include: { changer: { select: { name: true, avatarUrl: true } } },
        },
      },
    })

    if (!data) return { error: 'Estimativa não encontrada' }
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function generateEstimate(projectId: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId, UserRole.PM)

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { brief: true },
    })

    if (!project?.brief || project.brief.status !== 'COMPLETED') {
      return { error: 'Brief não concluído. Conclua o BriefForge antes de gerar estimativa.' }
    }

    const estimate = await prisma.estimate.create({
      data: {
        projectId,
        briefId: project.brief.id,
        createdBy: user.id,
        totalMin: 0,
        totalMax: 0,
        status: 'GENERATING',
        confidence: 'LOW',
      },
    })

    // Dispara em background
    EstimationEngine.generate(estimate.id, project.brief.id, user.id).catch(err => log.error({ err }, 'EstimationEngine falhou'))

    revalidatePath('/estimai')
    return { data: estimate }
  } catch (error) {
    return toActionError(error)
  }
}

export async function reviseEstimate(estimateId: string, reason: string) {
  try {
    const user = await requireServerUser()

    const current = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: { items: true },
    })

    if (!current) return { error: 'Estimativa não encontrada' }
    if (current.status !== 'READY') return { error: 'Só é possível revisar estimativas READY.' }

    await withProjectAccess(user.id, current.projectId, UserRole.PM)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newEstimate = await prisma.$transaction(async (tx: any) => {
      await tx.estimate.update({ where: { id: estimateId }, data: { status: 'ARCHIVED' } })

      const created = await tx.estimate.create({
        data: {
          projectId: current.projectId,
          briefId: current.briefId,
          createdBy: user.id,
          version: current.version + 1,
          totalMin: 0,
          totalMax: 0,
          currency: current.currency,
          confidence: 'LOW',
          status: 'GENERATING',
        },
      })

      await tx.estimateVersion.create({
        data: {
          estimateId,
          version: current.version,
          snapshot: current.items as unknown as object,
          reason,
          changedBy: user.id,
        },
      })

      return created
    })

    if (current.briefId) {
      EstimationEngine.generate(newEstimate.id, current.briefId, user.id).catch(err => log.error({ err }, 'EstimationEngine falhou'))
    }

    revalidatePath('/estimai')
    return { data: newEstimate }
  } catch (error) {
    return toActionError(error)
  }
}
