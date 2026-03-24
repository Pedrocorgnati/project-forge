import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess, requireFinancialAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { PLCalculator } from '@/lib/services/pl-calculator'
import { BurnRateCalculator } from '@/lib/services/burn-rate-calculator'
import { AppError } from '@/lib/errors'
import { createCheckpointSchema } from '@/lib/schemas/profit-report.schema'
import { UserRole } from '@prisma/client'
import type { CheckpointSnapshot } from '@/types/profitability'

// ─── POST /api/projects/[id]/checkpoints ──────────────────────────────────────

export async function POST(
  req: NextRequest,
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
    await withProjectAccess(user.id, projectId, UserRole.PM)
    requireFinancialAccess(user.role)

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json(
        { error: { code: 'PROJECT_080', message: 'Projeto não encontrado.' } },
        { status: 404 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const parsed = createCheckpointSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VAL_001',
            message: parsed.error.issues[0].message,
            details: parsed.error.issues,
          },
        },
        { status: 422 },
      )
    }

    // Calcular estado atual de P&L (FULL)
    const calculator = new PLCalculator(projectId)
    const plResult = await calculator.calculate('FULL')

    const burnCalculator = new BurnRateCalculator(projectId)
    const burnResult = await burnCalculator.calculate(plResult.cost, plResult.revenue)

    const snapshotData: CheckpointSnapshot = {
      period: 'FULL',
      capturedAt: new Date().toISOString(),
      revenue: plResult.revenue,
      cost: plResult.cost,
      margin: plResult.margin,
      marginPct: plResult.marginPct,
      hoursLogged: plResult.hoursLogged,
      billableHours: plResult.billableHours,
      billableRatio: plResult.billableRatio,
      teamCosts: plResult.teamCosts,
      burnRate: burnResult,
    }

    const checkpoint = await prisma.checkpoint.create({
      data: {
        projectId,
        name: parsed.data.name,
        snapshotData: snapshotData as unknown as object,
      },
    })

    return NextResponse.json(checkpoint, { status: 201 })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      )
    }
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro interno ao criar checkpoint.' } },
      { status: 500 },
    )
  }
}

// ─── GET /api/projects/[id]/checkpoints ───────────────────────────────────────

export async function GET(
  req: NextRequest,
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
    await withProjectAccess(user.id, projectId, UserRole.PM)
    requireFinancialAccess(user.role)

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
    const skip = (page - 1) * limit

    const checkpoints = await prisma.checkpoint.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    })

    const sanitized = checkpoints.map((cp: { id: string; name: string | null; createdAt: Date; snapshotData: unknown }) => {
      const snapshot = cp.snapshotData as Record<string, unknown>
      const burnRate = snapshot.burnRate as Record<string, unknown> | undefined
      return {
        id: cp.id,
        name: cp.name,
        createdAt: cp.createdAt,
        summary: {
          margin: snapshot.margin,
          marginPct: snapshot.marginPct,
          cost: snapshot.cost,
          revenue: snapshot.revenue,
          hoursLogged: snapshot.hoursLogged,
          isOverBudget: burnRate?.isOverBudget ?? false,
        },
        // PM não recebe rates individuais
        snapshotData: user.role === UserRole.SOCIO ? cp.snapshotData : undefined,
      }
    })

    return NextResponse.json(sanitized)
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      )
    }
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro interno.' } },
      { status: 500 },
    )
  }
}
