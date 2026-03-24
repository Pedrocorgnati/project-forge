import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth/with-auth'
import { withRole } from '@/lib/auth/with-role'
import { sendInviteEmail } from '@/lib/email/resend'
import type { AuthUser } from '@/types/auth'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/auth/invite')

const inviteBodySchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['PM', 'DEV']),
})

/**
 * POST /api/auth/invite
 * Cria convite de usuário interno e envia email via Resend.
 * Requer role SOCIO.
 */
async function inviteHandler(req: NextRequest, { user }: { user: AuthUser }): Promise<Response> {
  const body = await req.json().catch(() => null)
  const parsed = inviteBodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VAL_001', message: 'Dados inválidos', details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    )
  }

  const { email, role } = parsed.data

  // Verificar se email já possui conta ativa
  const existingUser = await prisma.user.findFirst({ where: { email } })
  if (existingUser) {
    return NextResponse.json(
      { error: { code: 'INVITE_002', message: 'Este email já possui uma conta.' } },
      { status: 409 }
    )
  }

  // Verificar se já existe convite pendente para este email
  const existingInvite = await prisma.inviteToken.findFirst({
    where: {
      email,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  })
  if (existingInvite) {
    return NextResponse.json(
      { error: { code: 'INVITE_003', message: 'Já existe um convite pendente para este email.' } },
      { status: 409 }
    )
  }

  // Criar token de convite com expiração de 7 dias
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const invite = await prisma.inviteToken.create({
    data: {
      email,
      role,
      expiresAt,
      createdBy: user.id,
    },
  })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const inviteUrl = `${siteUrl}/invite/${invite.token}`

  try {
    await sendInviteEmail(email, inviteUrl, role)
  } catch (err) {
    // Reverter o convite se o email falhar
    await prisma.inviteToken.delete({ where: { id: invite.id } })
    log.error({ err }, '[invite] Falha ao enviar email:')
    return NextResponse.json(
      { error: { code: 'INVITE_004', message: 'Falha ao enviar email de convite. Tente novamente.' } },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { message: 'Convite enviado com sucesso', inviteId: invite.id },
    { status: 201 }
  )
}

export const POST = withAuth(
  (req, ctx) => withRole(inviteHandler, ['SOCIO'])(req, ctx),
)
