import { UserRole } from '@prisma/client'
import { ROLE_PERMISSIONS, type Permission } from './constants'

// ─── FUNÇÕES DE VERIFICAÇÃO DE PERMISSÃO ─────────────────────────────────────

/**
 * Verifica se um role possui uma permissão específica.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Retorna todas as permissões de um role.
 */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

/**
 * Verifica se um role possui TODAS as permissões fornecidas.
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

/**
 * Verifica se um role possui ALGUMA das permissões fornecidas.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}
