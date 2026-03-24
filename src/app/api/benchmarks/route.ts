import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { UserRole } from '@prisma/client'

// ─── GET /api/benchmarks ──────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_001', message: 'Não autenticado.' } },
      { status: 401 },
    )
  }

  // Benchmarks acessíveis apenas por SOCIO, PM, DEV
  if (user.role === UserRole.CLIENTE) {
    return NextResponse.json(
      { error: { code: 'AUTH_003', message: 'Acesso negado.' } },
      { status: 403 },
    )
  }

  try {
    const { searchParams } = req.nextUrl
    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')

    const benchmarks = await prisma.benchmark.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(subcategory ? { subcategory } : {}),
      },
      orderBy: [{ category: 'asc' }, { subcategory: 'asc' }],
    })

    return NextResponse.json({ data: benchmarks, total: benchmarks.length })
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
