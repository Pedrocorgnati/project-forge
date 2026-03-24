// src/app/api/cron/checkpoint-service/route.ts
// BE-06a — RN012: Checkpoints automáticos em 25/50/75/100% de progresso
// Schedule: 0 0 * * * (diário) — configurar em vercel.json
// Protegido por CRON_SECRET no header Authorization

import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('cron/checkpoint')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function runCheckpointService(): Promise<{ processed: number; checkpoints: number; errors: string[] }> {
  const prisma = getPrismaClient()
  const errors: string[] = []
  let processed = 0
  let checkpoints = 0

  const THRESHOLDS = [25, 50, 75, 100]

  // Buscar todos os projetos ativos com tasks
  const projects = await prisma.project.findMany({
    where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
    include: {
      tasks: { select: { id: true, status: true } },
      checkpoints: { select: { progressPercentage: true } },
    },
  })

  for (const project of projects) {
    try {
      const total = project.tasks.length
      if (total === 0) continue

      const completed = project.tasks.filter((t: { status: string }) => t.status === 'DONE').length
      const progressPct = Math.round((completed / total) * 100)

      for (const threshold of THRESHOLDS) {
        if (progressPct >= threshold) {
          const alreadyExists = project.checkpoints.some(
            (c: { progressPercentage: number }) => c.progressPercentage === threshold,
          )
          if (!alreadyExists) {
            await prisma.checkpoint.create({
              data: {
                projectId: project.id,
                progressPercentage: threshold,
                tasksCompleted: completed,
                tasksTotal: total,
              },
            })

            // Emitir evento CHECKPOINT_REACHED para retroalimentação do EstimaAI (RN032)
            await prisma.event.create({
              data: {
                projectId: project.id,
                type: 'CHECKPOINT_REACHED',
                payload: { progressPercentage: threshold, tasksCompleted: completed, tasksTotal: total },
                sourceModule: 'rentabilia',
              },
            })

            checkpoints++
          }
        }
      }

      processed++
    } catch (err) {
      errors.push(`project ${project.id}: ${String(err)}`)
    }
  }

  return { processed, checkpoints, errors }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runCheckpointService()

    if (result.errors.length > 0) {
      log.error({ err: result.errors }, '[cron/checkpoint-service] Erros parciais:')
    }

    return NextResponse.json({
      ok: true,
      ...result,
      processedAt: new Date().toISOString(),
    })
  } catch (err) {
    log.error({ err }, '[cron/checkpoint-service] Falha crítica:')
    return NextResponse.json(
      { error: 'Internal server error', message: String(err) },
      { status: 500 },
    )
  }
}
