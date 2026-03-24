'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser } from '@/types/auth'
import type { UserRole } from '@prisma/client'
import { API } from '@/lib/constants/api-routes'

interface UseAuthReturn {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
  isRole: (role: UserRole) => boolean
}

/**
 * Hook client-side para acesso à sessão do usuário.
 * Sincroniza com as mudanças de estado do Supabase Auth em tempo real.
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function loadUser() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          setUser(null)
          setLoading(false)
          return
        }

        // Buscar dados completos do usuário via API
        const res = await fetch(API.AUTH.ME)
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUser()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    await fetch(API.AUTH.LOGOUT, { method: 'POST' })
    setUser(null)
  }, [])

  const isRole = useCallback(
    (role: UserRole) => user?.role === role,
    [user]
  )

  return { user, loading, signOut, isRole }
}
