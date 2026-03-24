import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { withRequestLogging } from '@/lib/middleware/request-logger'

export async function middleware(request: NextRequest) {
  return withRequestLogging(request, () => updateSession(request))
}

export const config = {
  matcher: [
    /*
     * Proteger todas as rotas exceto assets estáticos.
     * A lógica de rotas públicas (login, mfa, invite, etc.)
     * é gerenciada por isPublicPath() em lib/supabase/middleware.ts.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
