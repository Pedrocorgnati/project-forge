import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Proteger todas as rotas exceto:
     * - _next/static, _next/image (assets)
     * - favicon.ico
     * - Rotas públicas: /login, /auth/**, /api/webhooks/**
     */
    '/((?!_next/static|_next/image|favicon.ico|login|auth|api/webhooks|recuperar-senha).*)',
  ],
}
