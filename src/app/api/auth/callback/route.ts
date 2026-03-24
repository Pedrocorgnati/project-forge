import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/auth/callback')

/**
 * GET /api/auth/callback
 * Processa o retorno do OAuth GitHub (code exchange).
 * Supabase redireciona para esta rota após autenticação bem-sucedida.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    log.error({ err: error?.message }, '[auth/callback] Erro ao trocar código:')
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const authUser = data.user

  // Sincronizar usuário no banco (upsert seguro)
  // User.id matches auth.users.id — usar diretamente como PK
  try {
    await prisma.user.upsert({
      where: { id: authUser.id },
      create: {
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.full_name ?? authUser.email!,
        role: 'DEV',
        organizationId: process.env.DEFAULT_ORGANIZATION_ID ?? '',
      },
      update: {
        name: authUser.user_metadata?.full_name ?? undefined,
      },
    })
  } catch (err) {
    log.error({ err }, '[auth/callback] Erro ao sincronizar usuário:')
    // Não bloquear o login por erro de sync
  }

  return NextResponse.redirect(`${origin}${next}`)
}
