import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import { UserRole } from '@prisma/client'
import type { User } from '@prisma/client'

// Hierarquia de roles: SOCIO > PM > DEV > CLIENTE
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SOCIO]: 4,
  [UserRole.PM]: 3,
  [UserRole.DEV]: 2,
  [UserRole.CLIENTE]: 1,
}

/**
 * Verifica se o usuário tem acesso ao projeto.
 * Retorna o role do usuário no projeto.
 * Lança AppError AUTH_003 se não for membro.
 */
export async function withProjectAccess(
  userId: string,
  projectId: string,
  requiredRole?: UserRole,
): Promise<{ projectRole: UserRole }> {
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    include: {
      project: {
        select: { organizationId: true },
      },
      user: {
        select: { organizationId: true, role: true },
      },
    },
  })

  if (!member) {
    throw new AppError(ERROR_CODES.AUTH_003.code, ERROR_CODES.AUTH_003.message, 403)
  }

  // Cross-org check: SOCIO bypass apenas dentro da própria org
  if (member.project.organizationId !== member.user.organizationId) {
    throw new AppError(ERROR_CODES.AUTH_006.code, ERROR_CODES.AUTH_006.message, 403)
  }

  if (requiredRole && ROLE_HIERARCHY[member.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new AppError(ERROR_CODES.AUTH_003.code, ERROR_CODES.AUTH_003.message, 403)
  }

  return { projectRole: member.role }
}

/**
 * Verifica se o usuário pode assumir o role alvo.
 * Apenas SOCIO pode atribuir SOCIO. Role atribuído <= role do solicitante.
 */
export function canAssignRole(
  solicitantRole: UserRole,
  targetRole: UserRole,
): boolean {
  if (targetRole === UserRole.SOCIO && solicitantRole !== UserRole.SOCIO) {
    return false
  }
  return ROLE_HIERARCHY[solicitantRole] >= ROLE_HIERARCHY[targetRole]
}

/**
 * Verifica se o role do usuário está entre os roles permitidos.
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}

/**
 * Verifica acesso financeiro (P&L, cost rates): apenas SOCIO e PM.
 */
export function requireFinancialAccess(userRole: UserRole): void {
  if (!hasRole(userRole, [UserRole.SOCIO, UserRole.PM])) {
    throw new AppError(ERROR_CODES.AUTH_005.code, ERROR_CODES.AUTH_005.message, 403)
  }
}
