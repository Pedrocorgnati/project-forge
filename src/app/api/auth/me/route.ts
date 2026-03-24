import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado atual.
 * Usado pelo hook useAuth() no client-side.
 */
export async function GET() {
  const user = await getServerUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_001', message: 'Não autenticado.' } },
      { status: 401 }
    )
  }

  return NextResponse.json({ user })
}
