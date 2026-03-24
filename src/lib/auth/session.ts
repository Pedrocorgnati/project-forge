import { createClient } from '@/lib/supabase/server'
import type { SessionData, AuthUser } from '@/types/auth'
import { getServerUser } from './get-user'

/**
 * Retorna os dados de sessão completos (usuário + token + expiração).
 * Retorna null se não autenticado.
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return null

    const user = await getServerUser()
    if (!user) return null

    return {
      user,
      expiresAt: session.expires_at ?? 0,
      accessToken: session.access_token,
    }
  } catch {
    return null
  }
}

/**
 * Invalida a sessão do usuário atual (server-side).
 * Para logout no cliente, usar /api/auth/logout.
 */
export async function invalidateSession(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

/**
 * Verifica se o usuário tem nível de autenticação AAL2 (MFA verificado).
 * Retorna false se não autenticado ou sem MFA.
 */
export async function hasAAL2Session(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    return data?.currentLevel === 'aal2'
  } catch {
    return false
  }
}

/**
 * Verifica se o usuário tem fatores TOTP configurados.
 */
export async function hasMFAConfigured(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.mfa.listFactors()
    return (data?.totp?.length ?? 0) > 0
  } catch {
    return false
  }
}
