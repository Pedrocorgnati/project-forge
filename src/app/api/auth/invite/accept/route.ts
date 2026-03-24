import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { UserRole } from '@prisma/client'

const acceptBodySchema = z.object({
  token: z.string().min(1),
  supabaseUserId: z.string().min(1),
  name: z.string().min(1),
})

/**
 * POST /api/auth/invite/accept
 * Finaliza o aceite do convite: sincroniza o usuário no banco com a role do convite.
 * Chamado pelo InviteRegisterForm após criação da conta no Supabase Auth.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = acceptBodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VAL_001', message: 'Dados inválidos.' } },
      { status: 400 }
    )
  }

  const { token, supabaseUserId, name } = parsed.data

  // Validar token
  const invite = await prisma.inviteToken.findUnique({ where: { token } })

  if (!invite || invite.usedAt !== null || invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: { code: 'INVITE_001', message: 'Este convite expirou ou já foi utilizado.' } },
      { status: 410 }
    )
  }

  const role: UserRole = invite.role

  // Criar usuário no banco (User.id = Supabase Auth user ID)
  await prisma.user.upsert({
    where: { id: supabaseUserId },
    create: {
      id: supabaseUserId,
      email: invite.email,
      name,
      role,
      organizationId: process.env.DEFAULT_ORGANIZATION_ID ?? '',
    },
    update: {},
  })

  // Marcar token como usado
  await prisma.inviteToken.update({
    where: { token },
    data: { usedAt: new Date() },
  })

  return NextResponse.json({ message: 'Conta criada com sucesso' }, { status: 200 })
}
