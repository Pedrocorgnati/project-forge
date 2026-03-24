// src/lib/email/send-sla-reminder.ts
// module-17-clientportal-approvals / TASK-2 ST002
// Envia email de lembrete de 48h ao cliente com aprovação pendente
// Rastreabilidade: INT-107

interface SendSLAReminderParams {
  to: string
  approvalTitle: string
  projectName: string
  hoursRemaining: number
  approvalId: string
}

/**
 * Envia email de lembrete de prazo ao cliente.
 * Em development/test sem RESEND_API_KEY, apenas loga.
 * Fire-and-forget — não lança exceção, retorna { emailSent, error? }.
 */
export async function sendSLAReminderEmail({
  to,
  approvalTitle,
  projectName,
  hoursRemaining,
  approvalId,
}: SendSLAReminderParams): Promise<{ emailSent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const domain = process.env.RESEND_DOMAIN ?? 'projectforge.app'
  const portalLink = `${appUrl}/portal/approvals/${approvalId}`

  if (!apiKey || process.env.NODE_ENV === 'test') {
    console.log(`[DEV] SLA reminder para ${to}: ${portalLink} (${hoursRemaining}h restantes)`)
    return { emailSent: true }
  }

  const html = buildReminderHtml({ approvalTitle, projectName, hoursRemaining, portalLink })

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `ProjectForge <noreply@${domain}>`,
        to: [to],
        subject: `⚠️ Resposta necessária em ${hoursRemaining}h — ${approvalTitle}`,
        html,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      return { emailSent: false, error: `Resend error ${res.status}: ${body}` }
    }
    return { emailSent: true }
  } catch (err) {
    return { emailSent: false, error: String(err) }
  }
}

function buildReminderHtml({
  approvalTitle,
  projectName,
  hoursRemaining,
  portalLink,
}: {
  approvalTitle: string
  projectName: string
  hoursRemaining: number
  portalLink: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;background-color:#fffbeb;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #fcd34d;">
    <div style="margin-bottom:16px;">
      <span style="background-color:#fef3c7;color:#92400e;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;">
        ATENÇÃO — Resposta necessária
      </span>
    </div>
    <h2 style="font-size:20px;color:#111827;">Aprovação pendente: ${escapeHtml(approvalTitle)}</h2>
    <p style="color:#374151;font-size:16px;">
      A aprovação <strong>"${escapeHtml(approvalTitle)}"</strong> do projeto
      <strong>${escapeHtml(projectName)}</strong> ainda aguarda sua resposta.
    </p>
    <div style="background-color:#fef3c7;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-weight:600;color:#92400e;font-size:18px;">
        ⏰ Restam aproximadamente ${hoursRemaining} horas
      </p>
      <p style="margin:4px 0 0;color:#b45309;font-size:14px;">
        Após esse prazo, a aprovação expirará automaticamente.
      </p>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <a href="${portalLink}" style="background-color:#d97706;color:#fff;padding:12px 24px;border-radius:6px;font-size:16px;text-decoration:none;display:inline-block;">
        Responder agora
      </a>
    </div>
    <hr style="margin-top:24px;border:none;border-top:1px solid #e5e7eb;" />
    <p style="color:#9ca3af;font-size:12px;">
      Você está recebendo este email porque tem uma aprovação pendente no projeto ${escapeHtml(projectName)}.
    </p>
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
