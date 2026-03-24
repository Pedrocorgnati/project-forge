import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { EventBus } from '@/lib/events/bus'
import { EventType } from '@/lib/constants/events'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/events')

// ─── POST /api/events ─────────────────────────────────────────────────────────
// Endpoint interno — protegido por X-Internal-Secret.
// NUNCA expor publicamente.

const eventTypeValues = Object.values(EventType) as [string, ...string[]]

const PublishEventSchema = z.object({
  type: z.string().refine((v) => eventTypeValues.includes(v), { message: 'EventType inválido' }),
  projectId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
  sourceModule: z.string().optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Validar origem interna
  const internalSecret = req.headers.get('X-Internal-Secret')
  if (!internalSecret || internalSecret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json(
      { error: 'AUTH_001', message: 'Unauthorized' },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'VAL_001', message: 'Payload JSON inválido' },
      { status: 422 },
    )
  }

  const parsed = PublishEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VAL_001', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  try {
    await EventBus.publish(
      parsed.data.type as (typeof EventType)[keyof typeof EventType],
      parsed.data.projectId,
      parsed.data.data as never,
      parsed.data.sourceModule,
    )
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    log.error({ err: error }, '[POST /api/events] Erro ao publicar evento:')
    return NextResponse.json(
      { error: 'SYS_002', message: 'Erro ao publicar evento' },
      { status: 500 },
    )
  }
}
