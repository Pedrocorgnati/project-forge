import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db'
import { NotificationChannel } from '@prisma/client'
import type { AuthUser } from '@/types'

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Listar notificações do usuário autenticado
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: unread
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Lista de notificações paginada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 error:
 *                   nullable: true
 *                   type: string
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// ─── GET /api/notifications ───────────────────────────────────────────────────

const PAGE_SIZE = 20

export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const unreadOnly = url.searchParams.get('unread') === 'true'

  const where = {
    userId: user.id,
    channel: NotificationChannel.IN_APP,
    ...(unreadOnly ? { isRead: false } : {}),
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.notification.count({ where }),
  ])

  return NextResponse.json({
    data: {
      notifications,
      total,
      page,
      hasMore: page * PAGE_SIZE < total,
    },
    error: null,
  })
})
