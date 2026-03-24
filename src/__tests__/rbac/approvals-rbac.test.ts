// src/__tests__/rbac/approvals-rbac.test.ts
// module-17-clientportal-approvals / TASK-5 ST004
// Testes de RBAC: isolamento por role nas APIs de aprovação
// Rastreabilidade: INT-112

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetServerUser = vi.fn()
const mockWithProjectAccess = vi.fn()

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: (...args: unknown[]) => mockGetServerUser(...args),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: (...args: unknown[]) => mockWithProjectAccess(...args),
}))

const mockFindMany = vi.fn()
const mockCreate = vi.fn()
const mockFindFirst = vi.fn()
const mockFindUnique = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    approvalRequest: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    clientAccess: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
    approvalHistory: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

vi.mock('@/lib/approvals/log-history', () => ({
  logApprovalHistory: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/events/bus', () => ({
  EventBus: { publish: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/lib/constants/events', () => ({
  EventType: {
    APPROVAL_EXPIRED: 'APPROVAL_EXPIRED',
    APPROVAL_REQUESTED: 'APPROVAL_REQUESTED',
    APPROVAL_SUBMITTED: 'APPROVAL_SUBMITTED',
  },
}))

vi.mock('@/lib/constants/errors', () => ({
  ERROR_CODES: {
    AUTH_001: { code: 'AUTH_001', message: 'Unauthorized', status: 401 },
    APPROVAL_050: { code: 'APPROVAL_050', message: 'Client not found', status: 404 },
    APPROVAL_051: { code: 'APPROVAL_051', message: 'Already responded', status: 409 },
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

type UserRole = 'SOCIO' | 'PM' | 'DEV' | 'CLIENTE'

function makeUser(role: UserRole, overrides: Partial<{ id: string; email: string }> = {}) {
  return {
    id: overrides.id ?? `user_${role.toLowerCase()}`,
    email: overrides.email ?? `${role.toLowerCase()}@empresa.com`,
    name: `Test ${role}`,
    role,
  }
}

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/test',
    json: vi.fn().mockResolvedValue(body ?? {}),
    nextUrl: { searchParams: { get: vi.fn().mockReturnValue(null) } },
  } as unknown as import('next/server').NextRequest
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('RBAC: POST /api/projects/[id]/approvals — criação de aprovação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWithProjectAccess.mockResolvedValue(true)
  })

  it('DEV → 403 (não pode criar aprovações)', async () => {
    mockGetServerUser.mockResolvedValue(makeUser('DEV'))
    const { POST } = await import(
      '@/app/api/projects/[id]/approvals/route'
    )
    const res = await POST(makeRequest({ type: 'DOCUMENT', title: 'T', description: 'D', clientAccessId: 'ca_1' }), {
      params: Promise.resolve<{ id: string }>({ id: 'proj_1' }),
    })
    expect(res.status).toBe(403)
  })

  it('CLIENTE → 403 (não pode criar aprovações)', async () => {
    mockGetServerUser.mockResolvedValue(makeUser('CLIENTE'))
    const { POST } = await import(
      '@/app/api/projects/[id]/approvals/route'
    )
    const res = await POST(makeRequest({ type: 'DOCUMENT', title: 'T', description: 'D', clientAccessId: 'ca_1' }), {
      params: Promise.resolve<{ id: string }>({ id: 'proj_1' }),
    })
    expect(res.status).toBe(403)
  })

  it('usuário não autenticado → 401', async () => {
    mockGetServerUser.mockResolvedValue(null)
    const { POST } = await import(
      '@/app/api/projects/[id]/approvals/route'
    )
    const res = await POST(makeRequest({ type: 'DOCUMENT', title: 'T', description: 'D', clientAccessId: 'ca_1' }), {
      params: Promise.resolve<{ id: string }>({ id: 'proj_1' }),
    })
    expect(res.status).toBe(401)
  })
})

describe('RBAC: GET /api/projects/[id]/approvals — listagem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWithProjectAccess.mockResolvedValue(true)
  })

  it('DEV → 403 (não pode listar aprovações)', async () => {
    mockGetServerUser.mockResolvedValue(makeUser('DEV'))
    const { GET } = await import(
      '@/app/api/projects/[id]/approvals/route'
    )
    const res = await GET(makeRequest(), { params: Promise.resolve<{ id: string }>({ id: 'proj_1' }) })
    expect(res.status).toBe(403)
  })
})

describe('RBAC: GET /api/projects/[id]/approvals/export — CSV audit trail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('PM → 403 (apenas SOCIO pode exportar)', async () => {
    mockGetServerUser.mockResolvedValue(makeUser('PM'))
    const { GET } = await import(
      '@/app/api/projects/[id]/approvals/export/route'
    )
    const res = await GET(makeRequest(), { params: Promise.resolve<{ id: string }>({ id: 'proj_1' }) })
    expect(res.status).toBe(403)
  })

  it('DEV → 403 no export', async () => {
    mockGetServerUser.mockResolvedValue(makeUser('DEV'))
    const { GET } = await import(
      '@/app/api/projects/[id]/approvals/export/route'
    )
    const res = await GET(makeRequest(), { params: Promise.resolve<{ id: string }>({ id: 'proj_1' }) })
    expect(res.status).toBe(403)
  })

  it('CLIENTE → 403 no export', async () => {
    mockGetServerUser.mockResolvedValue(makeUser('CLIENTE'))
    const { GET } = await import(
      '@/app/api/projects/[id]/approvals/export/route'
    )
    const res = await GET(makeRequest(), { params: Promise.resolve<{ id: string }>({ id: 'proj_1' }) })
    expect(res.status).toBe(403)
  })

  it('não autenticado → 401 no export', async () => {
    mockGetServerUser.mockResolvedValue(null)
    const { GET } = await import(
      '@/app/api/projects/[id]/approvals/export/route'
    )
    const res = await GET(makeRequest(), { params: Promise.resolve<{ id: string }>({ id: 'proj_1' }) })
    expect(res.status).toBe(401)
  })
})

describe('RBAC: POST /api/portal/approvals/[approvalId]/respond — resposta de cliente', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('PM → 403 (apenas CLIENTE pode responder via portal)', async () => {
    mockGetServerUser.mockResolvedValue(makeUser('PM'))
    const { POST } = await import(
      '@/app/api/portal/approvals/[approvalId]/respond/route'
    )
    const res = await POST(
      makeRequest({ action: 'APPROVED', comment: 'ok' }),
      { params: Promise.resolve<{ approvalId: string }>({ approvalId: 'apr_1' }) },
    )
    expect(res.status).toBe(403)
  })

  it('SOCIO → 403 no portal de cliente', async () => {
    mockGetServerUser.mockResolvedValue(makeUser('SOCIO'))
    const { POST } = await import(
      '@/app/api/portal/approvals/[approvalId]/respond/route'
    )
    const res = await POST(
      makeRequest({ action: 'APPROVED', comment: 'ok' }),
      { params: Promise.resolve<{ approvalId: string }>({ approvalId: 'apr_1' }) },
    )
    expect(res.status).toBe(403)
  })

  it('CLIENTE com approval de outro cliente → 403 (IDOR check)', async () => {
    const clientB = makeUser('CLIENTE', { email: 'clientb@empresa.com' })
    mockGetServerUser.mockResolvedValue(clientB)

    // Approval pertence ao clientA
    mockFindUnique.mockResolvedValue({
      id: 'apr_1',
      status: 'PENDING',
      slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
      clientAccess: { clientEmail: 'clienta@empresa.com' }, // email diferente
      project: { id: 'proj_1', name: 'P' },
      requester: { id: 'user_pm', email: 'pm@empresa.com', name: 'PM' },
      title: 'Aprove isso',
    })

    const { POST } = await import(
      '@/app/api/portal/approvals/[approvalId]/respond/route'
    )
    const res = await POST(
      makeRequest({ action: 'APPROVED', comment: 'tentativa' }),
      { params: Promise.resolve<{ approvalId: string }>({ approvalId: 'apr_1' }) },
    )
    expect(res.status).toBe(403)
  })
})
