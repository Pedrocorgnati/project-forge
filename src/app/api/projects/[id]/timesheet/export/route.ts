import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess, requireFinancialAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { timesheetExportSchema } from '@/lib/schemas/profit-report.schema'
import { UserRole } from '@prisma/client'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// ─── GET /api/projects/[id]/timesheet/export ─────────────────────────────────

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
      start: searchParams.get('start') ?? undefined,
      end: searchParams.get('end') ?? undefined,
      userId: searchParams.get('userId') ?? undefined,
    }
    const parsed = timesheetExportSchema.safeParse(queryParams)
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
    const { start: startDate, end: endDate, userId: memberFilter } = parsed.data

    const where: Record<string, unknown> = {
      projectId,
      deletedAt: null,
    }
    if (startDate && endDate) {
      where.workDate = { gte: startDate, lte: endDate }
    }
    if (memberFilter) {
      where.userId = memberFilter
    }

    const entries = await prisma.timesheetEntry.findMany({
      where,
      include: {
        user: { select: { name: true, role: true, email: true } },
        task: { select: { title: true } },
      },
      orderBy: [{ workDate: 'asc' }, { userId: 'asc' }],
    })

    const headers = [
      'Data',
      'Membro',
      'Email',
      'Role',
      'Horas',
      'Faturável',
      'Task',
      'Descrição',
      'Criado em',
    ]

    const rows = entries.map((e: { workDate: Date; user: { name: string; email: string; role: string }; hours: unknown; billable: boolean; task?: { title: string } | null; description?: string | null; createdAt: Date }) =>
      [
        new Date(e.workDate).toLocaleDateString('pt-BR'),
        e.user.name,
        e.user.email,
        e.user.role,
        Number(e.hours).toFixed(2),
        e.billable ? 'Sim' : 'Não',
        e.task?.title ?? '',
        e.description ?? '',
        new Date(e.createdAt).toLocaleString('pt-BR'),
      ]
        .map(escapeCSV)
        .join(','),
    )

    const BOM = '\uFEFF'
    const csv = BOM + [headers.join(','), ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="timesheet-${projectId}-${new Date().toISOString().split('T')[0]}.csv"`,
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
      { error: { code: 'SYS_001', message: 'Erro interno ao exportar timesheet.' } },
      { status: 500 },
    )
  }
}
