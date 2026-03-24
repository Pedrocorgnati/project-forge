// src/lib/portal/create-client-user.ts
// module-16-clientportal-auth / TASK-1 ST005
// Helper: cria conta Supabase Auth + User Prisma para cliente do portal
// Rastreabilidade: INT-103

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { prisma } from '@/lib/db'
import type { User } from '@prisma/client'

interface CreateClientUserParams {
  email: string
  password: string
  name: string
  organizationId: string
}

/**
 * Cria conta Supabase Auth + User Prisma para o cliente do portal.
 *
 * Operação atômica: se o Prisma falhar após Supabase criar a conta,
 * a conta Supabase é deletada (rollback) para evitar estado parcial.
 *
 * @throws AppError SYS_001 se Supabase Auth estiver indisponível (503)
 * @throws AppError SYS_001 se Prisma falhar — após rollback Supabase (503)
 */
export async function createClientUser({
  email,
  password,
  name,
  organizationId,
}: CreateClientUserParams): Promise<User> {
  const supabaseAdmin = getSupabaseAdmin()
  const { AppError } = await import('@/lib/errors')

  // 1. Criar conta no Supabase Auth (já confirmada — token de convite serve como validação de email)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'CLIENTE' },
  })

  if (authError || !authData?.user) {
    throw new AppError(
      'SYS_001',
      `Serviço de autenticação indisponível: ${authError?.message ?? 'Supabase Auth error'}`,
      503,
    )
  }

  const supabaseUserId = authData.user.id

  // 2. Criar User no Prisma (id = supabaseId conforme padrão do projeto)
  // Se falhar, rollback no Supabase para evitar estado parcial
  try {
    const user = await prisma.user.create({
      data: {
        id: supabaseUserId,
        email,
        name,
        role: 'CLIENTE',
        organizationId,
      },
    })

    return user
  } catch (prismaError) {
    // Rollback: deletar conta Supabase para evitar estado sujo no banco
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId).catch((rollbackErr) => {
      console.error('[portal/create-client-user] Falha no rollback Supabase:', supabaseUserId, rollbackErr)
    })

    const message = prismaError instanceof Error ? prismaError.message : 'Erro desconhecido'
    throw new AppError('SYS_001', `Falha ao persistir usuário no banco: ${message}`, 503)
  }
}
