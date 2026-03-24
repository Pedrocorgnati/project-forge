import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRole } from '@prisma/client'
import { AppError } from '@/lib/errors'

// ─── MOCK DO PRISMA ───────────────────────────────────────────────────────────

const mockFindUnique = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    projectMember: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))

// ─── IMPORT APÓS MOCK ─────────────────────────────────────────────────────────

const { assertProjectAccess } = await import('../assert-project-access')

// ─── DADOS DE TESTE ───────────────────────────────────────────────────────────

const ORG_ID = 'org-111'
const PROJECT_ID = 'proj-222'
const USER_ID = 'user-333'
const OTHER_USER_ID = 'user-999'

function makeMember(role: UserRole = UserRole.PM) {
  return {
    role,
    project: { organizationId: ORG_ID },
    user: { organizationId: ORG_ID, role },
  }
}

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('assertProjectAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('membro do projeto: sem throw', async () => {
    mockFindUnique.mockResolvedValue(makeMember(UserRole.PM))
    await expect(assertProjectAccess(USER_ID, PROJECT_ID)).resolves.toBeUndefined()
  })

  it('membro com permissão correta: sem throw', async () => {
    mockFindUnique.mockResolvedValue(makeMember(UserRole.SOCIO))
    await expect(
      assertProjectAccess(USER_ID, PROJECT_ID, 'profitability:read'),
    ).resolves.toBeUndefined()
  })

  it('user sem vínculo com o projeto: lança AppError 403', async () => {
    mockFindUnique.mockResolvedValue(null)
    await expect(assertProjectAccess(OTHER_USER_ID, PROJECT_ID)).rejects.toThrow(AppError)
    await expect(assertProjectAccess(OTHER_USER_ID, PROJECT_ID)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('acesso cross-organization: lança AppError 403', async () => {
    mockFindUnique.mockResolvedValue({
      role: UserRole.PM,
      project: { organizationId: 'org-A' },
      user: { organizationId: 'org-B', role: UserRole.PM },
    })
    await expect(assertProjectAccess(USER_ID, PROJECT_ID)).rejects.toThrow(AppError)
    await expect(assertProjectAccess(USER_ID, PROJECT_ID)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('CLIENTE tentando acessar permissão financeira: lança AppError 403', async () => {
    mockFindUnique.mockResolvedValue(makeMember(UserRole.CLIENTE))
    await expect(
      assertProjectAccess(USER_ID, PROJECT_ID, 'profitability:read'),
    ).rejects.toThrow(AppError)
    await expect(
      assertProjectAccess(USER_ID, PROJECT_ID, 'profitability:read'),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('mensagem de erro não revela motivo específico (anti information disclosure)', async () => {
    mockFindUnique.mockResolvedValue(null)
    try {
      await assertProjectAccess(OTHER_USER_ID, PROJECT_ID)
      expect.fail('Deveria ter lançado erro')
    } catch (err) {
      expect(err).toBeInstanceOf(AppError)
      const appErr = err as AppError
      expect(appErr.message).toBe('Acesso negado a este projeto')
    }
  })
})
