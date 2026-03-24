import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import type { AuthUser } from '@/types/auth'

/**
 * Retorna o usuário autenticado como AuthUser tipado, ou null se não autenticado.
 * Combina dados do Supabase Auth com o registro no banco (role, organizationId).
 */
export async function getServerUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authUser) return null

    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        createdAt: true,
      },
    })

    if (!dbUser) return null

    // Verificar se MFA está habilitado para este usuário
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const mfaEnabled = (factors?.totp?.length ?? 0) > 0

    return {
      id: authUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      organizationId: dbUser.organizationId,
      avatarUrl: authUser.user_metadata?.avatar_url ?? null,
      mfaEnabled,
      createdAt: dbUser.createdAt.toISOString(),
    }
  } catch {
    return null
  }
}

/**
 * Retorna o usuário autenticado ou lança erro AUTH_001.
 * Use em route handlers que exigem autenticação obrigatória.
 */
export async function requireServerUser(): Promise<AuthUser> {
  const user = await getServerUser()
  if (!user) {
    const { AppError } = await import('@/lib/errors')
    throw new AppError('AUTH_001', 'Não autenticado. Faça login para continuar.', 401)
  }
  return user
}
