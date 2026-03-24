// src/app/api/cron/recalculate-project-metrics/route.ts
// BE-06c — Recalcular métricas de rentabilidade de projetos ativos
// Schedule: 0 2 * * * (diário às 2h) — configurar em vercel.json
// Protegido por CRON_SECRET no header Authorization

import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('cron/metrics')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function recalculateProjectMetrics(): Promise<{ processed: number; errors: string[] }> {
  const prisma = getPrismaClient()
  const errors: string[] = []
  let processed = 0

  const projects = await prisma.project.findMany({
    where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
    include: {
      timesheetEntries: { select: { hours: true, costRate: true, billable: true } },
      estimates: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { totalMin: true, totalMax: true },
      },
    },
  })

  for (const project of projects) {
    try {
      // Calcular horas registradas e custo real
      const totalHours = project.timesheetEntries.reduce((sum: number, e: { hours: unknown; billable: boolean; costRate?: unknown }) => sum + Number(e.hours), 0)
      const totalCost = project.timesheetEntries.reduce(
        (sum: number, e: { hours: unknown; billable: boolean; costRate?: unknown }) => sum + Number(e.hours) * Number(e.costRate ?? 0),
        0,
      )
      const billableHours = project.timesheetEntries
        .filter((e: { hours: unknown; billable: boolean; costRate?: unknown }) => e.billable)
        .reduce((sum: number, e: { hours: unknown; billable: boolean; costRate?: unknown }) => sum + Number(e.hours), 0)

      // Comparar com estimativa aprovada
      const estimatedMax = project.estimates[0] ? Number(project.estimates[0].totalMax) : null

      const utilizationPct = estimatedMax && estimatedMax > 0
        ? Math.round((totalCost / estimatedMax) * 100)
        : null

      await prisma.project.update({
        where: { id: project.id },
        data: {
          totalHoursLogged: totalHours,
          totalCostActual: totalCost,
          billableHours,
          utilizationPercentage: utilizationPct,
          metricsUpdatedAt: new Date(),
        },
      })

      processed++
    } catch (err) {
      errors.push(`project ${project.id}: ${String(err)}`)
    }
  }

  return { processed, errors }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await recalculateProjectMetrics()

    if (result.errors.length > 0) {
      log.error({ err: result.errors }, '[cron/recalculate-project-metrics] Erros parciais:')
    }

    return NextResponse.json({
      ok: true,
      ...result,
      processedAt: new Date().toISOString(),
    })
  } catch (err) {
    log.error({ err }, '[cron/recalculate-project-metrics] Falha crítica:')
    return NextResponse.json(
      { error: 'Internal server error', message: String(err) },
      { status: 500 },
    )
  }
}
