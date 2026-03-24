// src/app/api/cron/notification-dispatcher/route.ts
// BE-06d — Disparar notificações pendentes na fila
// Schedule: */5 * * * * (a cada 5 min) — configurar em vercel.json
// Protegido por CRON_SECRET no header Authorization

import { NextRequest, NextResponse } from 'next/server'
import { NotificationDispatcher } from '@/lib/notifications/dispatcher'
import { createLogger } from '@/lib/logger'

const log = createLogger('cron/notifications')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await NotificationDispatcher.dispatch()

    return NextResponse.json({
      ok: true,
      ...result,
      processedAt: new Date().toISOString(),
    })
  } catch (err) {
    log.error({ err }, '[cron/notification-dispatcher] Falha crítica:')
    return NextResponse.json(
      { error: 'Internal server error', message: String(err) },
      { status: 500 },
    )
  }
}
