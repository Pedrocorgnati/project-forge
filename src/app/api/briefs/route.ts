import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { BriefService } from '@/lib/briefforge/brief-service'
import { AppError } from '@/lib/errors'
import { UserRole } from '@prisma/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/briefs')

// ─── POST /api/briefs — Criar novo Brief ──────────────────────────────────────

const CreateBriefSchema = z.object({
  projectId: z.string().uuid('projectId deve ser um UUID válido'),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_001', message: 'Não autenticado. Faça login para continuar.' } },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'VAL_001', message: 'Payload JSON inválido.' } },
      { status: 422 },
    )
  }

  const parsed = CreateBriefSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VAL_001', message: 'Campo obrigatório ausente ou inválido.', details: parsed.error.flatten() } },
      { status: 422 },
    )
  }

  try {
    // Requires PM or higher (SOCIO >= PM in hierarchy)
    await withProjectAccess(user.id, parsed.data.projectId, UserRole.PM)
    const brief = await BriefService.create({ projectId: parsed.data.projectId })
    return NextResponse.json({ data: brief }, { status: 201 })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.statusCode },
      )
    }
    log.error({ err }, '[POST /api/briefs]')
    return NextResponse.json(
      { error: { code: 'SYS_500', message: 'Erro interno. Tente novamente.' } },
      { status: 500 },
    )
  }
}
