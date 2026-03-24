import { prisma } from '@/lib/db'
import type { UserRole } from '@prisma/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

/**
 * Sincroniza o usuário Supabase Auth com o banco de dados Prisma.
 * Se `inviteToken` for fornecido, extrai a role do convite e marca o token como usado.
 * Caso contrário, usa a role padrão DEV.
 *
 * Reutilizável para fluxos OAuth, email+senha e convite.
 */
export async function syncUserToPrisma(
  supabaseUser: SupabaseUser,
  inviteToken?: string
): Promise<void> {
  let role: UserRole = 'DEV' // default de segurança

  if (inviteToken) {
    const invite = await prisma.inviteToken.findUnique({
      where: { token: inviteToken },
    })

    if (!invite || invite.usedAt !== null || invite.expiresAt < new Date()) {
      throw new Error('INVITE_001')
    }

    role = invite.role

    // Marcar token como usado
    await prisma.inviteToken.update({
      where: { token: inviteToken },
      data: { usedAt: new Date() },
    })
  }

  await prisma.user.upsert({
    where: { id: supabaseUser.id },
    create: {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name: supabaseUser.user_metadata?.name ?? supabaseUser.email!,
      role,
      organizationId: process.env.DEFAULT_ORGANIZATION_ID ?? '',
    },
    update: {}, // nunca sobrescreve role se o usuário já existe
  })
}
