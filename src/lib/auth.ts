import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import type { User } from '@prisma/client'

/**
 * Retorna o usuário autenticado da sessão Supabase + registro no banco.
 * Lança AppError AUTH_001 se não autenticado.
 */
export async function getAuthUser(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser()

  if (error || !authUser) {
    throw new AppError(ERROR_CODES.AUTH_001.code, ERROR_CODES.AUTH_001.message, 401)
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
  })

  if (!dbUser) {
    throw new AppError(ERROR_CODES.AUTH_001.code, 'Perfil de usuário não encontrado', 401)
  }

  return dbUser
}

/**
 * Retorna o usuário OU null (sem lançar erro).
 * Útil para rotas opcionalmente autenticadas.
 */
export async function getAuthUserOrNull(): Promise<User | null> {
  try {
    return await getAuthUser()
  } catch {
    return null
  }
}
