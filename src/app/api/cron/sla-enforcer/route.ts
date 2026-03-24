// src/app/api/cron/sla-enforcer/route.ts
// module-17-clientportal-approvals / TASK-2 ST001b
// GET /api/cron/sla-enforcer — Vercel Cron: expira aprovações e envia lembretes
// Schedule: 0 * * * * (a cada hora) — configurar em vercel.json
// Rastreabilidade: INT-107
//
// Segurança: protegido por CRON_SECRET no header Authorization
// Risco: se CRON_SECRET vazar, qualquer um pode forçar expiração. Rotacionar imediatamente.

import { NextRequest, NextResponse } from 'next/server'
import { runSLAEnforcer } from '@/lib/sla/enforcer'
import { createLogger } from '@/lib/logger'

const log = createLogger('cron/sla-enforcer')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runSLAEnforcer()

    if (result.errors.length > 0) {
      log.error({ err: result.errors }, '[cron/sla-enforcer] Erros parciais:')
    }

    return NextResponse.json({
      ok: true,
      expired: result.expired,
      reminded: result.reminded,
      errors: result.errors,
      processedAt: new Date().toISOString(),
    })
  } catch (err) {
    log.error({ err }, '[cron/sla-enforcer] Falha crítica:')
    return NextResponse.json(
      { error: 'Internal server error', message: String(err) },
      { status: 500 },
    )
  }
}
