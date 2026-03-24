// src/lib/email/send-client-invitation.ts
// module-16-clientportal-auth / TASK-1 ST003
// Envia email de convite para portal do cliente via Resend REST API
// Rastreabilidade: INT-102

interface SendClientInvitationParams {
  to: string
  projectName: string
  inviterName: string
  inviteToken: string
}

/**
 * Envia email de convite para o portal do cliente.
 * Em desenvolvimento (sem RESEND_API_KEY), loga a URL no console.
 * Não lança exceção em caso de falha — retorna { emailSent: boolean, error?: string }.
 */
export async function sendClientInvitationEmail({
  to,
  projectName,
  inviterName,
  inviteToken,
}: SendClientInvitationParams): Promise<{ emailSent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const domain = process.env.RESEND_DOMAIN ?? 'projectforge.app'
  const portalLink = `${appUrl}/portal/${inviteToken}`

  // Desenvolvimento: logar em vez de enviar
  if (!apiKey || process.env.NODE_ENV === 'test') {
    console.log(`[DEV] Portal invite para ${to}: ${portalLink}`)
    return { emailSent: true }
  }

  const html = buildInviteHtml({ projectName, inviterName, portalLink })

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `ProjectForge <noreply@${domain}>`,
        to,
        subject: `Você foi convidado para o portal do projeto ${projectName}`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { emailSent: false, error: `Resend error: ${JSON.stringify(body)}` }
    }

    return { emailSent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { emailSent: false, error: message }
  }
}

function buildInviteHtml({
  projectName,
  inviterName,
  portalLink,
}: {
  projectName: string
  inviterName: string
  portalLink: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb;">
        <div style="background: #fff; border-radius: 8px; padding: 32px;">
          <h2 style="color: #111827; margin-bottom: 8px;">Você foi convidado para o portal do projeto</h2>
          <p style="color: #374151; font-size: 16px;">
            <strong>${inviterName}</strong> convidou você para acompanhar o projeto
            <strong>${projectName}</strong>.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Através do portal você poderá visualizar documentos, estimativas e aprovar entregas.
          </p>
          <div style="text-align: center; margin-top: 32px;">
            <a
              href="${portalLink}"
              style="
                display: inline-block;
                background-color: #2563eb;
                color: #fff;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 16px;
                text-decoration: none;
                font-weight: 600;
              "
            >
              Acessar Portal
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            Este link é pessoal e intransferível. Se você não esperava este convite, ignore este email.
          </p>
        </div>
      </body>
    </html>
  `
}
