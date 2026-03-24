import { vi } from 'vitest'
import type { UserRole } from '@prisma/client'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type TestRole = 'SOCIO' | 'PM' | 'DEV' | 'CLIENTE'

export interface MockUser {
  id: string
  email: string
  name: string
  role: UserRole
  organizationId: string
  avatarUrl: string | null
  mfaEnabled: boolean
  createdAt: string
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Constrói um objeto de usuário de teste para ser usado nos mocks.
 * Não persiste no banco — use factory.helper.ts para criar registros reais.
 */
export function buildMockUser(
  id: string,
  role: TestRole,
  organizationId: string,
  overrides: Partial<MockUser> = {},
): MockUser {
  const defaults: Record<TestRole, Omit<MockUser, 'id' | 'organizationId'>> = {
    SOCIO: {
      email: 'socio@test.local',
      name: 'Sócio Test',
      role: 'SOCIO' as UserRole,
      avatarUrl: null,
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
    },
    PM: {
      email: 'pm@test.local',
      name: 'PM Test',
      role: 'PM' as UserRole,
      avatarUrl: null,
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
    },
    DEV: {
      email: 'dev@test.local',
      name: 'Dev Test',
      role: 'DEV' as UserRole,
      avatarUrl: null,
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
    },
    CLIENTE: {
      email: 'cliente@test.local',
      name: 'Cliente Test',
      role: 'CLIENTE' as UserRole,
      avatarUrl: null,
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
    },
  }

  return { id, organizationId, ...defaults[role], ...overrides }
}

// ─── MOCKS POR CAMADA ─────────────────────────────────────────────────────────

/**
 * Mocka getAuthUser() de @/lib/auth (usado em Server Actions).
 * Retorna o usuário como Prisma User (throws se não autenticado).
 *
 * Chamar ANTES da importação das actions, ou usar vi.doMock dentro do teste.
 */
export function mockServerActionAuth(user: MockUser) {
  vi.mock('@/lib/auth', () => ({
    getAuthUser: vi.fn().mockResolvedValue(user),
    getAuthUserOrNull: vi.fn().mockResolvedValue(user),
  }))
}

/**
 * Mocka getServerUser() de @/lib/auth/get-user (usado em API Routes).
 * Retorna AuthUser | null.
 */
export function mockApiRouteAuth(user: MockUser | null) {
  vi.mock('@/lib/auth/get-user', () => ({
    getServerUser: vi.fn().mockResolvedValue(user),
    requireServerUser: user
      ? vi.fn().mockResolvedValue(user)
      : vi.fn().mockRejectedValue(
          Object.assign(new Error('Não autenticado'), { code: 'AUTH_001', statusCode: 401 }),
        ),
  }))
}

/**
 * Mocka autenticação como usuário sem sessão (401).
 */
export function mockUnauthenticated() {
  vi.mock('@/lib/auth', () => ({
    getAuthUser: vi.fn().mockRejectedValue(
      Object.assign(new Error('Não autenticado'), { code: 'AUTH_001', statusCode: 401 }),
    ),
    getAuthUserOrNull: vi.fn().mockResolvedValue(null),
  }))

  vi.mock('@/lib/auth/get-user', () => ({
    getServerUser: vi.fn().mockResolvedValue(null),
    requireServerUser: vi.fn().mockRejectedValue(
      Object.assign(new Error('Não autenticado'), { code: 'AUTH_001', statusCode: 401 }),
    ),
  }))
}
