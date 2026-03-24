/**
 * Contratos cross-module — não alterar sem ADR
 *
 * Este arquivo documenta explicitamente os contratos que module-2-shared-foundations
 * expõe para os módulos consumidores (module-3 a module-20).
 * Interfaces marcadas como ESTÁVEL são imutáveis após publicação.
 *
 * @module module-2/contracts
 */

// ─── CONTRATOS ESTÁVEIS ─────────────────────────────────────────────────────

/**
 * UserRole enum — re-exportado de @prisma/client
 * Consumidores: todos os módulos com auth
 * Estabilidade: ESTÁVEL (mudanças via migration)
 */
export type { UserRole, ProjectStatus } from '@prisma/client'

/**
 * ApiResponse<T> — wrapper de resposta de API
 * Consumidores: todos os módulos com API calls
 * Estabilidade: ESTÁVEL (imutável)
 */
export type ApiResponseContract<T> = { data: T; error: null } | { data: null; error: { code: string; message: string; details?: unknown } }

/**
 * PaginatedResult<T> — resultado paginado
 * Consumidores: module-3, module-5, module-7
 * Estabilidade: ESTÁVEL
 */
export type PaginatedResultContract<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// ─── CONTRATOS EXTENSÍVEIS ───────────────────────────────────────────────────

/**
 * ROUTES.* — constante de rotas frontend
 * Consumidores: todos os módulos com navegação
 * Estabilidade: EXTENSÍVEL (novas rotas podem ser adicionadas)
 * Importar de: @/lib/constants/routes
 */
export declare const ROUTES_CONTRACT: Record<string, string | ((...args: string[]) => string)>

/**
 * API.* — constante de rotas de API
 * Consumidores: todos os módulos com API calls
 * Estabilidade: EXTENSÍVEL
 * Importar de: @/lib/constants/api-routes
 */
export declare const API_CONTRACT: Record<string, string | ((...args: string[]) => string)>

/**
 * queryKeys.* — factory de TanStack Query keys
 * Consumidores: todos os módulos com TanStack Query
 * Importar de: @/lib/constants/query-keys
 */
export declare const QUERY_KEYS_CONTRACT: Record<string, unknown>

/**
 * PermissionGate — componente React client-side
 * Consumidores: module-3, module-4, module-5, module-6
 * CRÍTICO: PermissionGate é apenas UX — não substitui withAuth() no servidor
 * Importar de: @/components/auth/PermissionGate
 */
export declare const PERMISSION_GATE_CONTRACT: unknown

/**
 * AIProvider interface — abstração de IA
 * Consumidores: module-6, module-12, module-13
 * Estabilidade: ESTÁVEL (interface imutável)
 * Importar de: @/lib/ai/provider
 */
export declare const AI_PROVIDER_CONTRACT: unknown

/**
 * cn() — classnames + tailwind-merge
 * Consumidores: todos os módulos com UI
 * Importar de: @/lib/utils/cn
 */
export declare function cn_contract(...inputs: unknown[]): string
