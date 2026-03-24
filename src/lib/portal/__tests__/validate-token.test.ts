// src/lib/portal/__tests__/validate-token.test.ts
// module-16-clientportal-auth / TASK-4 ST001
// Testes unitários para validateInviteToken
// Rastreabilidade: INT-102

import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    clientAccess: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { validateInviteToken } from '../validate-token'

const mockFindUnique = vi.mocked(prisma.clientAccess.findUnique)

describe('validateInviteToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna valid: true para token PENDING com dados do projeto', async () => {
    const mockAccess = {
      id: 'ca-1',
      inviteToken: 'tok-abc',
      clientEmail: 'client@test.com',
      status: 'PENDING',
      project: { id: 'proj-1', name: 'Test Project', status: 'ACTIVE' },
      inviter: { id: 'user-1', name: 'PM User', email: 'pm@test.com' },
    }
    mockFindUnique.mockResolvedValue(mockAccess as never)

    const result = await validateInviteToken('tok-abc')

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.clientAccess.project.name).toBe('Test Project')
      expect(result.clientAccess.inviter?.name).toBe('PM User')
    }
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { inviteToken: 'tok-abc' },
      include: {
        project: { select: { id: true, name: true, status: true } },
        inviter: { select: { id: true, name: true, email: true } },
      },
    })
  })

  it('retorna NOT_FOUND para token inexistente', async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await validateInviteToken('nonexistent')

    expect(result).toEqual({ valid: false, error: 'NOT_FOUND' })
  })

  it('retorna REVOKED para token com status REVOKED', async () => {
    mockFindUnique.mockResolvedValue({ status: 'REVOKED' } as never)

    const result = await validateInviteToken('revoked-tok')

    expect(result).toEqual({ valid: false, error: 'REVOKED' })
  })

  it('retorna ACTIVE para token já utilizado', async () => {
    mockFindUnique.mockResolvedValue({ status: 'ACTIVE' } as never)

    const result = await validateInviteToken('used-tok')

    expect(result).toEqual({ valid: false, error: 'ACTIVE' })
  })
})
