'use client'

import type { ReactNode } from 'react'
import type { Permission } from '@/lib/rbac/constants'
import type { UserRole } from '@prisma/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { hasPermission } from '@/lib/rbac/permissions'

interface PermissionGateProps {
  permission?: Permission
  role?: UserRole | UserRole[]
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Componente que exibe children apenas se o usuário tiver a permissão/role necessária.
 * Usa useAuth() de module-3 para verificação em tempo real.
 *
 * @example
 * <PermissionGate role="SOCIO">
 *   <AdminPanel />
 * </PermissionGate>
 *
 * <PermissionGate permission="project:create" fallback={<AccessDenied />}>
 *   <CreateProjectButton />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  role,
  fallback = null,
  children,
}: PermissionGateProps): ReactNode {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return fallback

  // Verificação por role
  if (role) {
    const roles = Array.isArray(role) ? role : [role]
    if (!roles.includes(user.role as UserRole)) {
      return fallback
    }
  }

  // Verificação por permissão
  if (permission) {
    if (!hasPermission(user.role as UserRole, permission)) {
      return fallback
    }
  }

  return children
}
