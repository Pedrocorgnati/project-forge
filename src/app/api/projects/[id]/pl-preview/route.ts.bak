// src/app/api/projects/[id]/pl-preview/route.ts
// module-15-rentabilia-dashboard / TASK-8 / ST002
// Endpoint SOCIO-only: retorna resumo de P&L sem rates individuais

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { PLCalculator } from '@/lib/services/pl-calculator'
import { AppError } from '@/lib/errors'
import { UserRole } from '@prisma/client'

// ─── GET /api/projects/[id]/pl-preview ────────────────────────────────────────

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
    // Acesso restrito a SOCIO
    await withProjectAccess(user.id, projectId, UserRole.SOCIO)

    const calculator = new PLCalculator(projectId)
    const result = await calculator.calculate('FULL')

    return NextResponse.json({
      revenue: result.revenue,
      cost: result.cost,
      margin: result.margin,
      marginPct: result.marginPct,
      hoursLogged: result.hoursLogged,
      hasEstimate: result.hasEstimate,
    })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      )
    }
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro interno ao gerar preview de P&L.' } },
      { status: 500 },
    )
  }
}
