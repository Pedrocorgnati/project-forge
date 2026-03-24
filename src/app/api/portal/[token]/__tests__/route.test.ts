// src/app/api/portal/[token]/__tests__/route.test.ts
// module-16-clientportal-auth / TASK-4 ST004
// Testes para GET /api/portal/[token]
// Rastreabilidade: INT-102

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/portal/validate-token', () => ({
  validateInviteToken: vi.fn(),
}))

vi.mock('@/lib/constants/errors', () => ({
  ERROR_CODES: {
    APPROVAL_081: { code: 'APPROVAL_081', message: 'Convite não encontrado.' },
    APPROVAL_082: { code: 'APPROVAL_082', message: 'Convite já utilizado.' },
    APPROVAL_083: { code: 'APPROVAL_083', message: 'Convite revogado.' },
  },
}))

import { validateInviteToken } from '@/lib/portal/validate-token'
import { GET } from '../route'

const mockValidate = vi.mocked(validateInviteToken)

function makeReq() {
  return new NextRequest('http://localhost/api/portal/tok-123')
}

function makeParams(token: string) {
  return { params: Promise.resolve({ token }) }
}

describe('GET /api/portal/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 200 com dados para token PENDING válido', async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      clientAccess: {
        id: 'ca-1',
        clientEmail: 'client@test.com',
        status: 'PENDING',
        project: { id: 'p1', name: 'My Project', status: 'ACTIVE' },
        inviter: { id: 'u1', name: 'PM User', email: 'pm@test.com' },
      } as never,
    })

    const res = await GET(makeReq(), makeParams('tok-123'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.projectName).toBe('My Project')
    expect(data.inviterName).toBe('PM User')
    expect(data.clientEmail).toBe('client@test.com')
  })

  it('retorna 404 para token inexistente', async () => {
    mockValidate.mockResolvedValue({ valid: false, error: 'NOT_FOUND' })

    const res = await GET(makeReq(), makeParams('bad-tok'))

    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error.code).toBe('APPROVAL_081')
  })

  it('retorna 410 para token REVOKED', async () => {
    mockValidate.mockResolvedValue({ valid: false, error: 'REVOKED' })

    const res = await GET(makeReq(), makeParams('rev-tok'))

    expect(res.status).toBe(410)
    const data = await res.json()
    expect(data.error.code).toBe('APPROVAL_083')
  })

  it('retorna 409 para token ACTIVE (já usado)', async () => {
    mockValidate.mockResolvedValue({ valid: false, error: 'ACTIVE' })

    const res = await GET(makeReq(), makeParams('used-tok'))

    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error.code).toBe('APPROVAL_082')
  })
})
