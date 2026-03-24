import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess, requireFinancialAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { buildPLReportHTML } from '@/lib/pdf/pl-report-template'
import { UserRole } from '@prisma/client'

// ─── GET /api/projects/[id]/profit-reports/[reportId]/export ─────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> },
): Promise<NextResponse> {
  const { id: projectId, reportId } = await params
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

    const [project, report] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
      prisma.profitReport.findFirst({ where: { id: reportId, projectId } }),
    ])

    if (!project) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Projeto não encontrado.' } },
        { status: 404 },
      )
    }
    if (!report) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Relatório não encontrado.' } },
        { status: 404 },
      )
    }

    const teamCosts = (report.teamCosts as Record<string, unknown>[]).map((m) => ({
      userName: (m.userName as string) ?? '',
      role: (m.role as string) ?? '',
      hours: (m.hours as number) ?? 0,
      cost: (m.cost as number) ?? 0,
      pctOfTotal: (m.pctOfTotal as number) ?? 0,
    }))

    const html = buildPLReportHTML({
      projectName: project.name,
      projectId,
      reportDate: new Date(report.generatedAt).toLocaleDateString('pt-BR'),
      period: report.period,
      revenue: Number(report.revenue),
      cost: Number(report.cost),
      margin: Number(report.margin),
      marginPct: Number(report.marginPct),
      hoursLogged: Number(report.hoursLogged),
      billableHours: Number(report.billableHours),
      teamCosts,
    })

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="pl-report-${projectId}-${report.period.toLowerCase()}.html"`,
      },
    })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      )
    }
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro interno ao exportar relatório.' } },
      { status: 500 },
    )
  }
}
