import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess, requireFinancialAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { checkpointCompareSchema } from '@/lib/schemas/profit-report.schema'
import { UserRole } from '@prisma/client'

function calcDelta(
  a: number,
  b: number,
): { absolute: number; pct: number; trend: 'up' | 'down' | 'flat' } {
  const absolute = parseFloat((b - a).toFixed(2))
  const pct = a !== 0 ? parseFloat((((b - a) / Math.abs(a)) * 100).toFixed(1)) : 0
  const trend = absolute > 0.01 ? 'up' : absolute < -0.01 ? 'down' : 'flat'
  return { absolute, pct, trend }
}

// ─── GET /api/projects/[id]/checkpoints/compare?a={id}&b={id} ─────────────────

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
    const queryParams = {
      a: searchParams.get('a') ?? undefined,
      b: searchParams.get('b') ?? undefined,
    }
    const parsed = checkpointCompareSchema.safeParse(queryParams)
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
    const { a: checkpointAId, b: checkpointBId } = parsed.data

    if (checkpointAId === checkpointBId) {
      return NextResponse.json(
        { error: { code: 'VAL_002', message: 'Checkpoints "a" e "b" devem ser diferentes.' } },
        { status: 400 },
      )
    }

    const [cpA, cpB] = await Promise.all([
      prisma.checkpoint.findFirst({ where: { id: checkpointAId, projectId } }),
      prisma.checkpoint.findFirst({ where: { id: checkpointBId, projectId } }),
    ])

    if (!cpA) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Checkpoint "a" (${checkpointAId}) não encontrado neste projeto.` } },
        { status: 404 },
      )
    }
    if (!cpB) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Checkpoint "b" (${checkpointBId}) não encontrado neste projeto.` } },
        { status: 404 },
      )
    }

    const snapA = cpA.snapshotData as Record<string, unknown>
    const snapB = cpB.snapshotData as Record<string, unknown>
    const burnA = snapA.burnRate as Record<string, unknown> | undefined
    const burnB = snapB.burnRate as Record<string, unknown> | undefined

    const comparison = {
      checkpointA: { id: cpA.id, name: cpA.name, capturedAt: snapA.capturedAt },
      checkpointB: { id: cpB.id, name: cpB.name, capturedAt: snapB.capturedAt },
      metrics: {
        revenue: {
          a: snapA.revenue as number,
          b: snapB.revenue as number,
          delta: calcDelta(snapA.revenue as number, snapB.revenue as number),
        },
        cost: {
          a: snapA.cost as number,
          b: snapB.cost as number,
          delta: calcDelta(snapA.cost as number, snapB.cost as number),
        },
        margin: {
          a: snapA.margin as number,
          b: snapB.margin as number,
          delta: calcDelta(snapA.margin as number, snapB.margin as number),
        },
        marginPct: {
          a: snapA.marginPct as number,
          b: snapB.marginPct as number,
          delta: calcDelta(snapA.marginPct as number, snapB.marginPct as number),
        },
        hoursLogged: {
          a: snapA.hoursLogged as number,
          b: snapB.hoursLogged as number,
          delta: calcDelta(snapA.hoursLogged as number, snapB.hoursLogged as number),
        },
        billableHours: {
          a: snapA.billableHours as number,
          b: snapB.billableHours as number,
          delta: calcDelta(snapA.billableHours as number, snapB.billableHours as number),
        },
        projectedCost: {
          a: (burnA?.projectedTotalCost as number) ?? 0,
          b: (burnB?.projectedTotalCost as number) ?? 0,
          delta: calcDelta(
            (burnA?.projectedTotalCost as number) ?? 0,
            (burnB?.projectedTotalCost as number) ?? 0,
          ),
        },
      },
      teamComparison:
        user.role === UserRole.SOCIO
          ? buildTeamComparison(
              (snapA.teamCosts as Record<string, unknown>[]) ?? [],
              (snapB.teamCosts as Record<string, unknown>[]) ?? [],
            )
          : undefined,
    }

    return NextResponse.json(comparison)
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

function buildTeamComparison(
  teamA: Record<string, unknown>[],
  teamB: Record<string, unknown>[],
) {
  const allUserIds = new Set([
    ...teamA.map((m) => m.userId as string),
    ...teamB.map((m) => m.userId as string),
  ])

  return Array.from(allUserIds).map((userId) => {
    const memberA = teamA.find((m) => m.userId === userId)
    const memberB = teamB.find((m) => m.userId === userId)
    return {
      userId,
      userName: (memberA?.userName ?? memberB?.userName) as string,
      role: (memberA?.role ?? memberB?.role) as string,
      hoursA: (memberA?.hours as number) ?? 0,
      hoursB: (memberB?.hours as number) ?? 0,
      costA: (memberA?.cost as number) ?? 0,
      costB: (memberB?.cost as number) ?? 0,
      costDelta: calcDelta(
        (memberA?.cost as number) ?? 0,
        (memberB?.cost as number) ?? 0,
      ),
    }
  })
}
