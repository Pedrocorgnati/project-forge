import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db'
import { ERROR_CODES } from '@/lib/constants/errors'
import type { AuthUser } from '@/types'

// ─── PATCH /api/notifications/[id]/read ──────────────────────────────────────

export const PATCH = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    // Extrair [id] da URL
    const segments = req.nextUrl.pathname.split('/')
    const id = segments[segments.indexOf('notifications') + 1]

    if (!id) {
      return NextResponse.json(
        { data: null, error: { code: ERROR_CODES.VAL_001.code, message: 'ID da notificação é obrigatório.' } },
        { status: 422 },
      )
    }

    // Verificar existência e ownership (anti-IDOR)
    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true, isRead: true },
    })

    if (!notification) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Notificação não encontrada.' } },
        { status: 404 },
      )
    }

    if (notification.userId !== user.id) {
      return NextResponse.json(
        { data: null, error: { code: ERROR_CODES.AUTH_003.code, message: ERROR_CODES.AUTH_003.message } },
        { status: 403 },
      )
    }

    // Idempotente — se já lida, retornar 200 sem atualizar
    if (!notification.isRead) {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      })
    }

    return NextResponse.json({ data: { ok: true }, error: null })
  },
)
