import { NextRequest, NextResponse } from 'next/server'
import { NotificationScheduler } from '@/lib/notifications/scheduler'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/scheduler')

// ─── GET /api/scheduler ───────────────────────────────────────────────────────
// Endpoint para o cron job do Vercel.
// Protegido por CRON_SECRET — nunca expor publicamente.
// vercel.json: { "crons": [{ "path": "/api/scheduler", "schedule": "0 * * * *" }] }

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verificar CRON_SECRET (Vercel Cron envia em Authorization: Bearer)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'AUTH_002', message: 'Unauthorized' },
      { status: 401 },
    )
  }

  try {
    const result = await NotificationScheduler.runAll()
    return NextResponse.json({ ok: true, ...result }, { status: 200 })
  } catch (error) {
    log.error({ err: error }, '[Scheduler] Erro ao executar scheduler:')
    return NextResponse.json(
      { error: 'SYS_001', message: 'Erro interno do scheduler' },
      { status: 500 },
    )
  }
}
