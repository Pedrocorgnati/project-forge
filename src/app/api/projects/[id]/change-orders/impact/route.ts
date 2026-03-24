// ─── CHANGE ORDER IMPACT ROUTE ────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-3 (ST003)
// GET /api/projects/[id]/change-orders/impact — impacto acumulado de COs aprovadas
// Rastreabilidade: INT-075

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { ImpactCalculator } from '@/lib/services/impact-calculator'
import { ERROR_CODES } from '@/lib/constants/errors'
import { UserRole } from '@prisma/client'
import { AppError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/change-orders/impact')

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: projectId } = await params
  const user = await getServerUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.AUTH_001.code, message: ERROR_CODES.AUTH_001.message } },
      { status: 401 },
    )
  }

  // CLIENTE e DEV não têm acesso ao impact summary (dados financeiros)
  if (([UserRole.CLIENTE, UserRole.DEV] as string[]).includes(user.role)) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.CO_001.code, message: 'Acesso negado ao sumário de impacto.' } },
      { status: 403 },
    )
  }

  try {
    await withProjectAccess(user.id, projectId)

    const calculator = new ImpactCalculator()
    const impact = await calculator.calculateProjectImpact(projectId)

    return NextResponse.json(impact)
  } catch (error: unknown) {
    if (error instanceof AppError && error.statusCode === 403) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.AUTH_003.code, message: ERROR_CODES.AUTH_003.message } },
        { status: 403 },
      )
    }
    log.error({ err: error }, '[GET /change-orders/impact]')
    return NextResponse.json(
      { error: { code: ERROR_CODES.SYS_001.code, message: ERROR_CODES.SYS_001.message } },
      { status: 500 },
    )
  }
}
