import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { EmailQueue } from '@/lib/notifications/email-queue'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/webhooks/resend')

// ─── POST /api/webhooks/resend ────────────────────────────────────────────────
// Webhook handler para eventos de entrega do Resend.
// Verifica assinatura svix antes de processar qualquer payload.
// Sempre retorna 200 — Resend retenta em 5xx.

interface ResendWebhookEvent {
  type: string
  data: {
    email_id: string
    message_id?: string
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Extrair payload e headers svix
  const payload = await req.text()
  const svixHeaders = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  }

  // Verificar assinatura (previne SSRF/spoofing)
  let event: ResendWebhookEvent
  try {
    const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!)
    event = wh.verify(payload, svixHeaders) as ResendWebhookEvent
  } catch {
    return NextResponse.json(
      { error: 'VAL_002', message: 'Invalid signature' },
      { status: 401 },
    )
  }

  // Processar evento de delivery
  try {
    switch (event.type) {
      case 'email.sent':
        await EmailQueue.updateStatus(event.data.email_id, 'SENT', event.data.message_id)
        break

      case 'email.bounced':
        await EmailQueue.updateStatus(event.data.email_id, 'BOUNCED')
        break

      case 'email.complained':
        await EmailQueue.updateStatus(event.data.email_id, 'COMPLAINED')
        break

      case 'email.delivery_delayed':
        log.warn({ emailId: event.data.email_id }, '[ResendWebhook] Entrega atrasada')
        break

      default:
        // Evento desconhecido: ignorar silenciosamente
        break
    }
  } catch (error) {
    // Logar mas sempre retornar 200 para evitar loop de retenativas do Resend
    log.error({
      type: event.type,
      emailId: event.data.email_id,
      err: error instanceof Error ? error.message : String(error),
    }, '[ResendWebhook] Erro ao processar evento:')
  }

  // Sempre retornar 200
  return NextResponse.json({ ok: true }, { status: 200 })
}
