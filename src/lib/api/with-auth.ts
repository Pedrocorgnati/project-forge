// Versão completa do HOF de autenticação para API routes (com RBAC, permissões e IDOR).
// Nota: existe também src/lib/auth/with-auth.ts — versão simplificada para uso em routes
// que não requerem verificação de role/permissão nem acesso a projetos.
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { requireServerUser } from '@/lib/auth/get-user'
import { AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import { hasPermission } from '@/lib/rbac/permissions'
import { assertProjectAccess } from './assert-project-access'
import type { AuthUser } from '@/types'
import type { Permission } from '@/lib/rbac/constants'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type ApiHandler = (req: NextRequest, user: AuthUser) => Promise<NextResponse>

interface WithAuthOptions {
  requiredPermission?: Permission
  requiredRole?: UserRole | UserRole[]
}

interface WithAuthAndProjectOptions extends WithAuthOptions {
  /** Nome do parâmetro de rota que contém o projectId. Padrão: 'projectId' */
  projectIdParam?: string
}

// ─── HOF: withAuth ────────────────────────────────────────────────────────────

/**
 * Higher-Order Function que protege API routes com autenticação e autorização.
 *
 * Fluxo:
 * 1. Recupera sessão → 401 se ausente
 * 2. Verifica requiredRole → 403 se não atender
 * 3. Verifica requiredPermission → 403 se não atender
 * 4. Chama handler com (req, user)
 * 5. Captura erros → retorna resposta JSON com ApiError shape
 */
export function withAuth(handler: ApiHandler, options: WithAuthOptions = {}) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const user = await requireServerUser()

      // Verificação de role
      if (options.requiredRole) {
        const allowedRoles = Array.isArray(options.requiredRole)
          ? options.requiredRole
          : [options.requiredRole]
        if (!allowedRoles.includes(user.role)) {
          return errorResponse(ERROR_CODES.AUTH_003.code, ERROR_CODES.AUTH_003.message, 403)
        }
      }

      // Verificação de permissão
      if (options.requiredPermission && !hasPermission(user.role, options.requiredPermission)) {
        return errorResponse(ERROR_CODES.AUTH_003.code, ERROR_CODES.AUTH_003.message, 403)
      }

      return await handler(req, user)
    } catch (err) {
      if (err instanceof AppError) {
        return errorResponse(err.code, err.message, err.statusCode)
      }
      return errorResponse(ERROR_CODES.SYS_001.code, ERROR_CODES.SYS_001.message, 500)
    }
  }
}

// ─── HOF: withAuthAndProject ──────────────────────────────────────────────────

/**
 * Combina `withAuth` + `assertProjectAccess` para routes com [projectId].
 * Verifica autenticação, permissões e vínculo com o projeto em sequência.
 *
 * @example
 * export const GET = withAuthAndProject(
 *   async (req, user) => { ... },
 *   { requiredPermission: 'estimate:read' }
 * )
 */
export function withAuthAndProject(
  handler: ApiHandler & { projectId?: string },
  options: WithAuthAndProjectOptions = {},
) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }): Promise<NextResponse> => {
    try {
      const user = await requireServerUser()

      // Verificação de role
      if (options.requiredRole) {
        const allowedRoles = Array.isArray(options.requiredRole)
          ? options.requiredRole
          : [options.requiredRole]
        if (!allowedRoles.includes(user.role)) {
          return errorResponse(ERROR_CODES.AUTH_003.code, ERROR_CODES.AUTH_003.message, 403)
        }
      }

      // Verificação de permissão
      if (options.requiredPermission && !hasPermission(user.role, options.requiredPermission)) {
        return errorResponse(ERROR_CODES.AUTH_003.code, ERROR_CODES.AUTH_003.message, 403)
      }

      // Anti-IDOR: verificar acesso ao projeto
      const params = await ctx.params
      const projectIdKey = options.projectIdParam ?? 'projectId'
      const projectId = params[projectIdKey]
      if (projectId) {
        await assertProjectAccess(user.id, projectId, options.requiredPermission)
      }

      return await handler(req, user)
    } catch (err) {
      if (err instanceof AppError) {
        return errorResponse(err.code, err.message, err.statusCode)
      }
      return errorResponse(ERROR_CODES.SYS_001.code, ERROR_CODES.SYS_001.message, 500)
    }
  }
}

// ─── HELPER ───────────────────────────────────────────────────────────────────

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ data: null, error: { code, message } }, { status })
}
