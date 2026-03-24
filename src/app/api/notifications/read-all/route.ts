import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db'
import { NotificationChannel } from '@prisma/client'
import type { AuthUser } from '@/types'

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

export const PATCH = withAuth(async (_req: NextRequest, user: AuthUser) => {
  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      channel: NotificationChannel.IN_APP,
      isRead: false,
    },
    data: { isRead: true, readAt: new Date() },
  })

  return NextResponse.json({ data: { ok: true }, error: null })
})
