// src/app/api/portal/[token]/accept/__tests__/route.test.ts
// module-16-clientportal-auth / TASK-4 ST005
// Testes para POST /api/portal/[token]/accept
// Rastreabilidade: INT-103

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  prisma: {
    clientAccess: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/portal/create-client-user', () => ({
  createClientUser: vi.fn(),
}))

vi.mock('@/lib/events/bus', () => ({
  EventBus: { publish: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/lib/constants/events', () => ({
  EventType: { CLIENT_ACCEPTED: 'CLIENT_ACCEPTED' },
}))

vi.mock('@/lib/constants/errors', () => ({
  ERROR_CODES: {
    APPROVAL_081: { code: 'APPROVAL_081', message: 'Convite não encontrado.' },
    APPROVAL_082: { code: 'APPROVAL_082', message: 'Convite já utilizado.' },
    APPROVAL_083: { code: 'APPROVAL_083', message: 'Convite revogado.' },
    VAL_001: { code: 'VAL_001', message: 'Validação falhou.' },
    SYS_001: { code: 'SYS_001', message: 'Erro interno.' },
  },
}))

vi.mock('@/lib/errors', () => ({
  AppError: class AppError extends Error {
    code: string
    statusCode: number
    constructor(code: string, message: string, statusCode: number) {
      super(message)
      this.code = code
      this.statusCode = statusCode
    }
  },
}))

import { prisma } from '@/lib/db'
import { createClientUser } from '@/lib/portal/create-client-user'
import { POST } from '../route'

const mockFindUnique = vi.mocked(prisma.clientAccess.findUnique)
const mockUpdate = vi.mocked(prisma.clientAccess.update)
const mockCreateUser = vi.mocked(createClientUser)

function makeReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/portal/tok-123/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams(token: string) {
  return { params: Promise.resolve({ token }) }
}

describe('POST /api/portal/[token]/accept', () => {
  const validBody = { name: 'João Silva', password: 'senhasegura123' }
  const pendingAccess = {
    id: 'ca-1',
    inviteToken: 'tok-123',
    clientEmail: 'client@test.com',
    status: 'PENDING',
    project: { id: 'p1', name: 'My Project', organizationId: 'org-1' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue(pendingAccess as never)
    mockCreateUser.mockResolvedValue({ id: 'user-new' } as never)
    mockUpdate.mockResolvedValue({} as never)
  })

  it('aceita convite válido → 200 com userId', async () => {
    const res = await POST(makeReq(validBody), makeParams('tok-123'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.userId).toBe('user-new')
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'client@test.com',
      password: 'senhasegura123',
      name: 'João Silva',
      organizationId: 'org-1',
    })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ca-1' },
        data: expect.objectContaining({ status: 'ACTIVE', clientName: 'João Silva' }),
      }),
    )
  })

  it('retorna 400 para token não encontrado', async () => {
    mockFindUnique.mockResolvedValue(null)

    const res = await POST(makeReq(validBody), makeParams('bad-tok'))

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.code).toBe('APPROVAL_081')
  })

  it('retorna 400 para token não-PENDING (ACTIVE)', async () => {
    mockFindUnique.mockResolvedValue({ ...pendingAccess, status: 'ACTIVE' } as never)

    const res = await POST(makeReq(validBody), makeParams('used-tok'))

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.code).toBe('APPROVAL_082')
  })

  it('retorna 422 para password curto', async () => {
    const res = await POST(makeReq({ name: 'João', password: '123' }), makeParams('tok-123'))

    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.error.code).toBe('VAL_001')
  })

  it('retorna 422 para nome curto (< 2 chars)', async () => {
    const res = await POST(makeReq({ name: 'J', password: 'senhasegura123' }), makeParams('tok-123'))

    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.error.code).toBe('VAL_001')
  })
})
