'use client'

import { useMemo } from 'react'
import type { UserRole } from '@/types'
import type { Permission } from '@/lib/rbac/constants'
import { hasPermission, getPermissions } from '@/lib/rbac/permissions'
import { useAuth } from '@/lib/hooks/use-auth'

export interface UsePermissionsReturn {
  /** Verifica se o usuário possui a permissão */
  can: (permission: Permission) => boolean
  /** Verifica se o usuário NÃO possui a permissão */
  cannot: (permission: Permission) => boolean
  /** Verifica se o usuário tem o role exato */
  is: (role: UserRole) => boolean
  /** Verifica se o usuário tem um dos roles fornecidos */
  isOneOf: (roles: UserRole[]) => boolean
  /** Role atual do usuário (null se não autenticado) */
  role: UserRole | null
  /** Lista de permissões do role atual */
  permissions: Permission[]
}

/**
 * Hook de autorização client-side.
 * Consome o role do usuário autenticado e expõe helpers de verificação.
 *
 * NOTA: Depende de useAuth (module-3). Atualmente usa stub que retorna null.
 */
export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth()
  const role = user?.role ?? null

  return useMemo(() => {
    const permissions: Permission[] = role ? getPermissions(role) : []

    const can = (permission: Permission): boolean => {
      if (!role) return false
      return hasPermission(role, permission)
    }

    const cannot = (permission: Permission): boolean => !can(permission)

    const is = (checkRole: UserRole): boolean => role === checkRole

    const isOneOf = (roles: UserRole[]): boolean => {
      if (!role) return false
      return roles.includes(role)
    }

    return { can, cannot, is, isOneOf, role, permissions }
  }, [role])
}
