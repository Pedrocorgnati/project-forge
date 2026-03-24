import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/categories')

// ─── GET /api/categories ──────────────────────────────────────────────────────

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_001', message: 'Não autenticado.' } },
      { status: 401 },
    )
  }

  try {
    const categories = await prisma.projectCategory.findMany({
      where: { parentId: null },
      include: {
        subcategories: { orderBy: { name: 'asc' } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: categories })
  } catch (err) {
    log.error({ err }, '[GET /api/categories]')
    return NextResponse.json(
      { error: { code: 'SYS_001', message: 'Erro interno.' } },
      { status: 500 },
    )
  }
}
