import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/auth/logout')

/**
 * POST /api/auth/logout
 * Invalida a sessão do usuário e limpa os cookies de autenticação.
 * Requer autenticação.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_001', message: 'Não autenticado.' } },
      { status: 401 }
    )
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    log.error({ err: error.message }, '[auth/logout] Erro ao fazer logout:')
    return NextResponse.json(
      { error: { code: 'LOGOUT_001', message: 'Erro ao encerrar sessão.' } },
      { status: 500 }
    )
  }

  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))
}
