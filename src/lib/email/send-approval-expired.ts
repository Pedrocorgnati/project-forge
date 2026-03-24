// src/lib/email/send-approval-expired.ts
// module-17-clientportal-approvals / TASK-2 ST003
// Notifica SOCIO/PM que uma aprovação expirou sem resposta do cliente
// Rastreabilidade: INT-108

interface SendApprovalExpiredParams {
  to: string
  requesterName: string
  approvalTitle: string
  projectName: string
  projectId: string
  approvalId: string
  clientEmail: string
}

/**
 * Envia email de expiração ao solicitante (SOCIO/PM).
 * Em development/test sem RESEND_API_KEY, apenas loga.
 * Não lança exceção — retorna { emailSent, error? }.
 */
export async function sendApprovalExpiredEmail({
  to,
  requesterName,
  approvalTitle,
  projectName,
  projectId,
  approvalId,
  clientEmail,
}: SendApprovalExpiredParams): Promise<{ emailSent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const domain = process.env.RESEND_DOMAIN ?? 'projectforge.app'
  const approvalLink = `${appUrl}/projects/${projectId}/approvals/${approvalId}`

  if (!apiKey || process.env.NODE_ENV === 'test') {
    console.log(`[DEV] Approval expired email para ${to}: approval "${approvalTitle}" expirou`)
    return { emailSent: true }
  }

  const html = buildExpiredHtml({ requesterName, approvalTitle, projectName, clientEmail, approvalLink })

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
        subject: `❌ Aprovação expirou sem resposta — ${approvalTitle}`,
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

function buildExpiredHtml({
  requesterName,
  approvalTitle,
  projectName,
  clientEmail,
  approvalLink,
}: {
  requesterName: string
  approvalTitle: string
  projectName: string
  clientEmail: string
  approvalLink: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;background-color:#fef2f2;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #fca5a5;">
    <h2 style="font-size:20px;color:#991b1b;">Aprovação expirou sem resposta</h2>
    <p style="color:#374151;">
      Olá ${escapeHtml(requesterName)}, a aprovação <strong>"${escapeHtml(approvalTitle)}"</strong>
      do projeto <strong>${escapeHtml(projectName)}</strong> expirou após 72 horas sem resposta de
      <strong>${escapeHtml(clientEmail)}</strong>.
    </p>
    <p style="color:#6b7280;font-size:14px;">
      Você pode criar uma nova solicitação de aprovação ou entrar em contato diretamente com o cliente.
    </p>
    <a href="${approvalLink}"
       style="background-color:#dc2626;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
      Ver detalhes da aprovação
    </a>
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
