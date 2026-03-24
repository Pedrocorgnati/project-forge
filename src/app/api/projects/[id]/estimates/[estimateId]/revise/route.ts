import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { EstimationEngine } from '@/lib/services/estimation-engine'
import { EventBus } from '@/lib/events/bus'
import { EventType } from '@/lib/constants/events'
import { AppError } from '@/lib/errors'
import { UserRole } from '@prisma/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/estimate/revise')

const ReviseSchema = z.object({
  reason: z.string().min(10, 'Informe o motivo da revisão (mínimo 10 caracteres)'),
})

// ─── POST /api/projects/[id]/estimates/[estimateId]/revise ────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; estimateId: string }> },
): Promise<NextResponse> {
  const { id: projectId, estimateId } = await params
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_001', message: 'Não autenticado.' } },
      { status: 401 },
    )
  }

  try {
    await withProjectAccess(user.id, projectId, UserRole.PM)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'VAL_001', message: 'Payload JSON inválido.' } },
        { status: 422 },
      )
    }

    const parsed = ReviseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VAL_001', message: 'Dados inválidos.', details: parsed.error.flatten() } },
        { status: 400 },
      )
    }

    const current = await prisma.estimate.findUnique({
      where: { id: estimateId, projectId },
      include: { items: true },
    })

    if (!current) {
      return NextResponse.json(
        { error: { code: 'ESTIMATE_080', message: 'Estimativa não encontrada.' } },
        { status: 404 },
      )
    }

    if (current.status !== 'READY') {
      return NextResponse.json(
        { error: { code: 'VAL_001', message: 'Só é possível revisar estimativas com status READY.' } },
        { status: 422 },
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newEstimate = await prisma.$transaction(async (tx: any) => {
      // Arquivar versão atual
      await tx.estimate.update({
        where: { id: estimateId },
        data: { status: 'ARCHIVED' },
      })

      // Criar nova Estimate (incrementa version)
      const created = await tx.estimate.create({
        data: {
          projectId,
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

      // Registrar EstimateVersion da versão anterior (snapshot imutável)
      await tx.estimateVersion.create({
        data: {
          estimateId,
          version: current.version,
          snapshot: current.items as unknown as object,
          reason: parsed.data.reason,
          changedBy: user.id,
        },
      })

      return created
    })

    // Disparar nova geração em background
    if (current.briefId) {
      EstimationEngine.generate(newEstimate.id, current.briefId, user.id).catch(err => log.error({ err }, 'EstimationEngine falhou'))
    }

    // Publicar evento
    await EventBus.publish(
      EventType.ESTIMATE_REVISED,
      projectId,
      {
        previousEstimateId: estimateId,
        newEstimateId: newEstimate.id,
        projectId,
        reason: parsed.data.reason,
      },
    )

    return NextResponse.json({ data: newEstimate }, { status: 201 })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.statusCode })
    }
    log.error({ err }, '[POST /revise]')
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro interno.' } },
      { status: 500 },
    )
  }
}
