import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/webhooks/github')

/**
 * POST /api/webhooks/github/{projectId}
 * Recebe eventos de push do GitHub.
 * Segurança: validação HMAC-SHA256 com timing-safe compare (THREAT-005).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params

  try {
    // 1. Verificar assinatura HMAC
    const signature = request.headers.get('x-hub-signature-256')
    const delivery = request.headers.get('x-github-delivery')

    if (!signature || !delivery) {
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 })
    }

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
    if (!webhookSecret) {
      log.error('[GitHub Webhook] GITHUB_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const rawBody = await request.text()
    const expectedSig = `sha256=${createHmac('sha256', webhookSecret).update(rawBody).digest('hex')}`

    const sigBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSig)

    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Lazy load Prisma only at runtime
    const { getPrismaClient } = await import('@/lib/db')
    const prisma = getPrismaClient()

    // 2a. Verificar payload timestamp para prevenir replay attack (BE-08)
    // GitHub não envia header de timestamp — verificamos o campo `created_at` do payload
    // para limitar janela de replay a 5 minutos. O delivery ID abaixo previne duplicatas.
    let parsedPayload: Record<string, unknown>
    try {
      parsedPayload = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const payloadTimestamp = typeof parsedPayload.created_at === 'string'
      ? new Date(parsedPayload.created_at).getTime()
      : null
    if (payloadTimestamp !== null && !isNaN(payloadTimestamp)) {
      const ageSec = (Date.now() - payloadTimestamp) / 1000
      if (ageSec > 300) {
        log.warn('[GitHub Webhook] Rejecting stale payload (age: %ds)', Math.round(ageSec))
        return NextResponse.json({ error: 'Payload too old (replay prevention)' }, { status: 401 })
      }
    }

    // 2b. Verificar replay: rejeitar delivery IDs já processados (anti-replay)
    const existingEvent = await prisma.event.findFirst({
      where: { correlationId: delivery },
      select: { id: true },
    })
    if (existingEvent) {
      return NextResponse.json({ received: true, eventType: 'duplicate', skipped: true })
    }

    // 2b. Verificar projeto existe e pertence a alguma org
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const payload = parsedPayload
    const eventType = request.headers.get('x-github-event') ?? 'push'

    // 3. Registrar evento no bus
    await prisma.event.create({
      data: {
        projectId,
        type: 'GITHUB_PUSH',
        payload: payload as never,
        sourceModule: 'handoffai',
        correlationId: delivery,
      },
    })

    // 4. Atualizar commit SHA no RAGIndex (se existir)
    const commitSha = (payload.after as string | undefined) ?? null
    if (commitSha && commitSha !== '0000000000000000000000000000000000000000') {
      await prisma.rAGIndex.updateMany({
        where: { projectId },
        data: {
          lastCommitSha: commitSha,
          indexationStatus: 'PENDING',
        },
      })
    }

    return NextResponse.json({ received: true, eventType })
  } catch (error) {
    log.error({ err: error }, '[GitHub Webhook] Error:')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
