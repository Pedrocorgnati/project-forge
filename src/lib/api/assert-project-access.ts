import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import { hasPermission } from '@/lib/rbac/permissions'
import type { Permission } from '@/lib/rbac/constants'

// ─── GUARD ANTI-IDOR ──────────────────────────────────────────────────────────

/**
 * Verifica se o usuário tem acesso ao projeto e opcionalmente a uma permissão específica.
 *
 * Lança AppError 403 se:
 * - O usuário não é membro do projeto
 * - O acesso é cross-organization
 * - O usuário não possui a permissão requerida
 *
 * **CRÍTICO:** Nunca expõe o motivo específico ao cliente para evitar information disclosure.
 * Referência STRIDE: THREAT-MODEL.md ameaça T-002 (IDOR cross-project)
 *
 * @param userId - ID do usuário autenticado
 * @param projectId - ID do projeto a ser acessado
 * @param requiredPermission - Permissão opcional a verificar
 */
export async function assertProjectAccess(
  userId: string,
  projectId: string,
  requiredPermission?: Permission,
): Promise<void> {
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    include: {
      project: { select: { organizationId: true } },
      user: { select: { organizationId: true, role: true } },
    },
  })

  // Sem vínculo → 403 (não revelar se projeto existe ou não)
  if (!member) {
    throw new AppError(ERROR_CODES.AUTH_003.code, 'Acesso negado a este projeto', 403)
  }

  // Cross-org check
  if (member.project.organizationId !== member.user.organizationId) {
    throw new AppError(ERROR_CODES.AUTH_003.code, 'Acesso negado a este projeto', 403)
  }

  // Verificação de permissão específica
  if (requiredPermission && !hasPermission(member.user.role, requiredPermission)) {
    throw new AppError(ERROR_CODES.AUTH_003.code, 'Acesso negado a este projeto', 403)
  }
}
