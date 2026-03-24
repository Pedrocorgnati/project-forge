import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@prisma/client'

// Rotas que não exigem autenticação
const PUBLIC_PATHS = [
  '/login',
  '/recuperar-senha',
  '/mfa/setup',
  '/mfa/verify',
  '/invite',
  '/api/auth/callback',
  '/api/webhooks',
  '/_next',
  '/favicon.ico',
]

// Rotas MFA — acessíveis sem AAL2 (durante o fluxo de verificação)
const MFA_PATHS = ['/mfa/setup', '/mfa/verify']

// Mapa de roles permitidos por prefixo de rota
export const ROUTE_GUARDS: Record<string, UserRole[]> = {
  '/dashboard':    ['SOCIO', 'PM', 'DEV'],
  '/projetos':     ['SOCIO', 'PM', 'DEV'],
  '/projects':     ['SOCIO', 'PM', 'DEV'],
  '/briefforge':   ['SOCIO', 'PM', 'DEV'],
  '/estimai':      ['SOCIO', 'PM', 'DEV'],
  '/scopeshield':  ['SOCIO', 'PM', 'DEV'],
  '/handoffai':    ['SOCIO', 'PM', 'DEV'],
  '/rentabilia':   ['SOCIO', 'PM', 'DEV'],
  '/portal':       ['CLIENTE'],
  '/configuracoes': ['SOCIO'],
  '/perfil':       ['SOCIO', 'PM', 'DEV', 'CLIENTE'],
  '/board':        ['SOCIO', 'PM', 'DEV'],
  '/notificacoes': ['SOCIO', 'PM', 'DEV'],
}

// Rota de fallback por role
export const FALLBACK_ROUTE: Record<UserRole, string> = {
  SOCIO:   '/dashboard',
  PM:      '/dashboard',
  DEV:     '/dashboard',
  CLIENTE: '/portal',
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

function isMFAPath(pathname: string): boolean {
  return MFA_PATHS.some((p) => pathname.startsWith(p))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANTE: não adicionar lógica entre createServerClient e getUser
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirecionar para login se não autenticado
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Aplicar guards de rota se autenticado
  if (user && !isPublicPath(pathname)) {
    const userRole = user.user_metadata?.role as UserRole | undefined

    if (userRole) {
      // MFA enforcement para CLIENTE
      if (userRole === 'CLIENTE' && !isMFAPath(pathname)) {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        const currentLevel = aalData?.currentLevel

        if (currentLevel !== 'aal2') {
          const { data: factorsData } = await supabase.auth.mfa.listFactors()
          const hasTotp = (factorsData?.totp?.length ?? 0) > 0

          if (!hasTotp) {
            return NextResponse.redirect(new URL('/mfa/setup', request.url))
          }
          return NextResponse.redirect(new URL('/mfa/verify', request.url))
        }
      }

      // Route guards por role
      for (const [prefix, allowedRoles] of Object.entries(ROUTE_GUARDS)) {
        if (!pathname.startsWith(prefix)) continue

        if (!allowedRoles.includes(userRole)) {
          const destination = FALLBACK_ROUTE[userRole] ?? '/login'
          return NextResponse.redirect(new URL(destination, request.url))
        }
        break
      }
    }
  }

  return supabaseResponse
}
