import type { UserRole } from '@prisma/client'

const ROLE_LABELS: Record<UserRole, string> = {
  SOCIO: 'Sócio',
  PM: 'Project Manager',
  DEV: 'Desenvolvedor',
  CLIENTE: 'Cliente',
}

/**
 * Envia email de convite para usuário interno via Resend REST API.
 * Em desenvolvimento (sem RESEND_API_KEY), loga a URL no console.
 */
export async function sendInviteEmail(
  email: string,
  inviteUrl: string,
  role: UserRole
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  // Desenvolvimento: logar em vez de enviar
  if (!apiKey || process.env.NODE_ENV === 'test') {
    console.log(`[DEV] Invite URL para ${email} (${role}): ${inviteUrl}`)
    return
  }

  const roleLabel = ROLE_LABELS[role] ?? role

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ProjectForge <no-reply@projectforge.app>',
      to: email,
      subject: `Você foi convidado para o ProjectForge como ${roleLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a1a1a;">Bem-vindo ao ProjectForge</h2>
            <p>Você foi convidado para participar do <strong>ProjectForge</strong> como <strong>${roleLabel}</strong>.</p>
            <p>Clique no botão abaixo para aceitar o convite e criar sua conta:</p>
            <a
              href="${inviteUrl}"
              style="
                display: inline-block;
                background-color: #0f172a;
                color: #ffffff;
                padding: 12px 24px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 600;
                margin: 16px 0;
              "
            >
              Aceitar convite
            </a>
            <p style="color: #666; font-size: 14px;">Este link expira em <strong>7 dias</strong>.</p>
            <p style="color: #666; font-size: 14px;">Se você não solicitou este convite, ignore este email com segurança.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">ProjectForge — Plataforma de gestão de projetos</p>
          </body>
        </html>
      `,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`[resend] Falha ao enviar convite: ${JSON.stringify(body)}`)
  }
}
