import type { UserRole } from '@prisma/client'

/**
 * Roles do sistema — espelhado de UserRole do Prisma.
 * Use UserRole do @prisma/client como fonte canônica.
 * AuthRole mantido para backward-compatibility em componentes client-side
 * que não importam do Prisma.
 */
export enum AuthRole {
  SOCIO = 'SOCIO',
  PM = 'PM',
  DEV = 'DEV',
  CLIENTE = 'CLIENTE',
}

/**
 * Usuário autenticado com role resolvida.
 * Retornado por getServerUser() e useAuth().
 */
export interface AuthUser {
  id: string            // UUID do Supabase Auth
  email: string
  role: UserRole
  organizationId: string // UUID da organização — usado para validação IDOR
  name: string | null
  avatarUrl: string | null
  mfaEnabled: boolean
  createdAt: string     // ISO 8601
}

/**
 * Dados de sessão disponíveis client-side (sem dados sensíveis).
 */
export interface SessionData {
  user: AuthUser
  expiresAt: number   // Unix timestamp
  accessToken: string // JWT — nunca logar completo
}

/**
 * Resultado padronizado de operações de autenticação.
 */
export type AuthResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }

/**
 * Mapa de permissões por role.
 * Usado pelo PermissionGate e pelo middleware RBAC.
 */
export type RolePermissions = Record<UserRole, string[]>

/**
 * Opções para helpers de autenticação de API Routes.
 */
export interface AuthOptions {
  roles?: UserRole[]
  requireProjectMember?: boolean
  allowSocioBypass?: boolean // default: true
}
