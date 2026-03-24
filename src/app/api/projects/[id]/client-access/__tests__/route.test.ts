// src/app/api/projects/[id]/client-access/__tests__/route.test.ts
// module-16-clientportal-auth / TASK-4 ST003
// Testes para POST e GET /api/projects/[id]/client-access
// Rastreabilidade: INT-102

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    clientAccess: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/events/bus', () => ({
  EventBus: { publish: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/lib/constants/events', () => ({
  EventType: { CLIENT_INVITED: 'CLIENT_INVITED', EMAIL_FAILED: 'EMAIL_FAILED' },
}))

vi.mock('@/lib/email/send-client-invitation', () => ({
  sendClientInvitationEmail: vi.fn().mockResolvedValue({ emailSent: true }),
}))

vi.mock('@/lib/portal/invite-rate-limit', () => ({
  checkInviteRateLimit: vi.fn().mockReturnValue({ allowed: true }),
}))

vi.mock('@/lib/constants/errors', () => ({
  ERROR_CODES: {
    AUTH_001: { code: 'AUTH_001', message: 'Não autenticado.' },
    AUTH_003: { code: 'AUTH_003', message: 'Sem permissão.' },
    VAL_001: { code: 'VAL_001', message: 'Validação falhou.' },
    APPROVAL_080: { code: 'APPROVAL_080', message: 'Convite já existe.' },
    PROJECT_080: { code: 'PROJECT_080', message: 'Projeto não encontrado.' },
  },
}))

// Mock UserRole enum
vi.mock('@prisma/client', () => ({
  UserRole: { SOCIO: 'SOCIO', PM: 'PM', DEV: 'DEV', CLIENTE: 'CLIENTE' },
}))

import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { checkInviteRateLimit } from '@/lib/portal/invite-rate-limit'
import { POST, GET } from '../route'

const mockGetUser = vi.mocked(getServerUser)
const mockProjectAccess = vi.mocked(withProjectAccess)
const mockFindFirst = vi.mocked(prisma.clientAccess.findFirst)
const mockCreate = vi.mocked(prisma.clientAccess.create)
const mockFindMany = vi.mocked(prisma.clientAccess.findMany)
const mockProjectFind = vi.mocked(prisma.project.findUnique)
const mockRateLimit = vi.mocked(checkInviteRateLimit)

const socioUser = { id: 'u1', email: 'socio@test.com', name: 'Socio', role: 'SOCIO' }
const devUser = { id: 'u2', email: 'dev@test.com', name: 'Dev', role: 'DEV' }

function makePostReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/projects/proj-1/client-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeGetReq() {
  return new NextRequest('http://localhost/api/projects/proj-1/client-access')
}

function makeParams() {
  return { params: Promise.resolve({ id: 'proj-1' }) }
}

describe('POST /api/projects/[id]/client-access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(socioUser as never)
    mockProjectAccess.mockResolvedValue(undefined as never)
    mockRateLimit.mockReturnValue({ allowed: true })
    mockFindFirst.mockResolvedValue(null)
    mockProjectFind.mockResolvedValue({ id: 'proj-1', name: 'Test', organizationId: 'org-1' } as never)
    mockCreate.mockResolvedValue({
      id: 'ca-new',
      clientEmail: 'client@test.com',
      inviteToken: 'tok-new',
      status: 'PENDING',
      project: { id: 'proj-1', name: 'Test' },
      inviter: { id: 'u1', name: 'Socio', email: 'socio@test.com' },
    } as never)
  })

  it('SOCIO cria convite → 201', async () => {
    const res = await POST(makePostReq({ clientEmail: 'client@test.com' }), makeParams())

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.clientEmail).toBe('client@test.com')
  })

  it('DEV não pode convidar → 403', async () => {
    mockGetUser.mockResolvedValue(devUser as never)

    const res = await POST(makePostReq({ clientEmail: 'client@test.com' }), makeParams())

    expect(res.status).toBe(403)
  })

  it('não autenticado → 401', async () => {
    mockGetUser.mockResolvedValue(null)

    const res = await POST(makePostReq({ clientEmail: 'client@test.com' }), makeParams())

    expect(res.status).toBe(401)
  })

  it('email duplicado PENDING → 409', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing', status: 'PENDING' } as never)

    const res = await POST(makePostReq({ clientEmail: 'client@test.com' }), makeParams())

    expect(res.status).toBe(409)
  })

  it('email malformado → 422', async () => {
    const res = await POST(makePostReq({ clientEmail: 'not-an-email' }), makeParams())

    expect(res.status).toBe(422)
  })

  it('rate limit excedido → 429', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, retryAfter: 3600 })

    const res = await POST(makePostReq({ clientEmail: 'client@test.com' }), makeParams())

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('3600')
  })
})

describe('GET /api/projects/[id]/client-access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(socioUser as never)
    mockProjectAccess.mockResolvedValue(undefined as never)
    mockFindMany.mockResolvedValue([
      { id: 'ca-1', clientEmail: 'a@test.com', status: 'ACTIVE' },
    ] as never)
  })

  it('retorna lista de acessos para SOCIO', async () => {
    const res = await GET(makeGetReq(), makeParams())

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].clientEmail).toBe('a@test.com')
  })

  it('DEV não pode listar → 403', async () => {
    mockGetUser.mockResolvedValue(devUser as never)

    const res = await GET(makeGetReq(), makeParams())

    expect(res.status).toBe(403)
  })
})
