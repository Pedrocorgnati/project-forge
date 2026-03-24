import { NextResponse, type NextRequest } from 'next/server'
import { getServerUser } from './get-user'
import type { AuthUser, AuthOptions } from '@/types/auth'

type AuthHandler = (req: NextRequest, ctx: { user: AuthUser }) => Promise<Response>

/**
 * Wrapper para API Routes que exigem autenticação.
 * Retorna AUTH_001 (401) se não autenticado.
 *
 * @example
 * export const GET = withAuth(async (req, { user }) => {
 *   return NextResponse.json({ userId: user.id })
 * })
 */
export function withAuth(handler: AuthHandler, _options?: AuthOptions) {
  return async (req: NextRequest): Promise<Response> => {
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_001',
            message: 'Sessão expirada. Faça login novamente.',
          },
        },
        { status: 401 }
      )
    }

    return handler(req, { user })
  }
}
