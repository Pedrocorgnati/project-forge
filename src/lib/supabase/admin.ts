// src/lib/supabase/admin.ts
// Cliente Supabase com service_role para operações administrativas do servidor.
// NUNCA importar em Client Components — usa SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from '@supabase/supabase-js'

let _adminClient: ReturnType<typeof createClient> | null = null

/**
 * Retorna o cliente Supabase com service_role (admin).
 * Lazy singleton — instanciado apenas na primeira chamada.
 */
export function getSupabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
  }
  return _adminClient
}
