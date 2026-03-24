import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { SessionService } from '@/lib/briefforge/session-service'
import { AppError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/briefs/session')

// ─── GET /api/briefs/[id]/sessions/[sessionId] — Estado da sessão ────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
): Promise<NextResponse> {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_001', message: 'Não autenticado.' } },
      { status: 401 },
    )
  }

  try {
    const { sessionId } = await params
    const session = await SessionService.findById(sessionId)

    // Verify project access — any member role
    await withProjectAccess(user.id, session.brief.projectId)

    return NextResponse.json({ data: session })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.statusCode },
      )
    }
    log.error({ err }, '[GET /api/briefs/[id]/sessions/[sessionId]]')
    return NextResponse.json(
      { error: { code: 'SYS_500', message: 'Erro interno. Tente novamente.' } },
      { status: 500 },
    )
  }
}
