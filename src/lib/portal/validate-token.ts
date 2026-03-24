// src/lib/portal/validate-token.ts
// module-16-clientportal-auth / TASK-1 ST004
// Helper: valida ClientAccess por token de convite
// Rastreabilidade: INT-102

import { prisma } from '@/lib/db'
import type { ClientAccess, Project, User } from '@prisma/client'

export type TokenValidationResult =
  | { valid: true; clientAccess: ClientAccess & { project: Pick<Project, 'id' | 'name' | 'status'>; inviter: Pick<User, 'id' | 'name' | 'email'> | null } }
  | { valid: false; error: 'NOT_FOUND' | 'REVOKED' | 'ACTIVE' | 'EXPIRED' }

/**
 * Valida um token de convite e retorna o ClientAccess com dados do projeto e convidante.
 * Retorna `valid: false` com código de erro em caso de token inválido/usado/revogado.
 */
export async function validateInviteToken(token: string): Promise<TokenValidationResult> {
  const clientAccess = await prisma.clientAccess.findUnique({
    where: { inviteToken: token },
    include: {
      project: { select: { id: true, name: true, status: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
  })

  if (!clientAccess) return { valid: false, error: 'NOT_FOUND' }
  if (clientAccess.status === 'REVOKED') return { valid: false, error: 'REVOKED' }
  if (clientAccess.status === 'ACTIVE') return { valid: false, error: 'ACTIVE' }
  if (clientAccess.expiresAt && clientAccess.expiresAt < new Date()) return { valid: false, error: 'EXPIRED' }

  return { valid: true, clientAccess }
}
