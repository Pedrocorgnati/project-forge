import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@prisma/client'
import type { AuthUser } from '@/types/auth'

type RoleHandler = (req: NextRequest, ctx: { user: AuthUser }) => Promise<Response>

/**
 * Wrapper para API Routes que exigem roles específicas.
 * Deve ser composto com withAuth.
 * Retorna AUTH_005 (403) se o role do usuário não for permitido.
 *
 * @example
 * export const POST = withAuth(
 *   withRole(async (req, { user }) => { ... }, ['SOCIO']),
 * )
 */
export function withRole(handler: RoleHandler, roles: UserRole[]) {
  return async (req: NextRequest, ctx: { user: AuthUser }): Promise<Response> => {
    if (!roles.includes(ctx.user.role as UserRole)) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_005',
            message: 'Você não tem permissão para esta operação.',
          },
        },
        { status: 403 }
      )
    }
    return handler(req, ctx)
  }
}
