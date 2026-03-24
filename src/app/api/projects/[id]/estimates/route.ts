import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { EstimationEngine } from '@/lib/services/estimation-engine'
import { AppError } from '@/lib/errors'
import { UserRole } from '@prisma/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/estimates')

// ─── POST /api/projects/[id]/estimates ────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: projectId } = await params
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_001', message: 'Não autenticado. Faça login para continuar.' } },
      { status: 401 },
    )
  }

  try {
    await withProjectAccess(user.id, projectId, UserRole.PM)

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        brief: {
          include: { sessions: { where: { status: 'COMPLETED' }, take: 1 } },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: { code: 'PROJECT_080', message: 'Projeto não encontrado.' } },
        { status: 404 },
      )
    }

    const brief = project.brief
    if (!brief || brief.status !== 'COMPLETED') {
      return NextResponse.json(
        {
          error: {
            code: 'BRIEF_083',
            message:
              'Brief aprovado não encontrado. Conclua o BriefForge antes de gerar estimativa.',
          },
        },
        { status: 422 },
      )
    }

    // Cria Estimate com status GENERATING
    const estimate = await prisma.estimate.create({
      data: {
        projectId,
        briefId: brief.id,
        createdBy: user.id,
        version: 1,
        totalMin: 0,
        totalMax: 0,
        currency: 'BRL',
        confidence: 'LOW',
        status: 'GENERATING',
      },
    })

    // Dispara geração em background (sem await — responde imediatamente)
    EstimationEngine.generate(estimate.id, brief.id, user.id).catch(err => log.error({ err }, 'EstimationEngine falhou'))

    return NextResponse.json({ data: estimate }, { status: 201 })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.statusCode })
    }
    log.error({ err }, '[POST /api/projects/[id]/estimates]')
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro interno. Tente novamente.' } },
      { status: 500 },
    )
  }
}

// ─── GET /api/projects/[id]/estimates ─────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: projectId } = await params
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_001', message: 'Não autenticado.' } },
      { status: 401 },
    )
  }

  try {
    await withProjectAccess(user.id, projectId)

    const { searchParams } = new URL(_req.url)
    const includeGenerating = searchParams.get('includeGenerating') === 'true'

    const estimates = await prisma.estimate.findMany({
      where: {
        projectId,
        ...(!includeGenerating ? { status: { not: 'GENERATING' } } : {}),
      },
      orderBy: { version: 'desc' },
      include: { _count: { select: { items: true, versions: true } } },
    })

    return NextResponse.json({ data: estimates })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.statusCode })
    }
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro interno.' } },
      { status: 500 },
    )
  }
}
