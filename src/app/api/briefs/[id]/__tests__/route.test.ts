import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Error class stubs ──────────────────────────────────────────────────────

class BriefNotFoundErrorStub extends Error {
  readonly statusCode = 404
  readonly code = 'BRIEF_080'
  constructor() {
    super('Brief não encontrado.')
    this.name = 'BriefNotFoundError'
  }
}

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockGetServerUser = vi.fn()
const mockWithProjectAccess = vi.fn()
const mockBriefServiceFindById = vi.fn()
const mockBriefServiceUpdate = vi.fn()
const mockPrismaFindUnique = vi.fn()

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: (...args: unknown[]) => mockGetServerUser(...args),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: (...args: unknown[]) => mockWithProjectAccess(...args),
}))

vi.mock('@/lib/briefforge/brief-service', () => ({
  BriefService: {
    findById: (...args: unknown[]) => mockBriefServiceFindById(...args),
    update: (...args: unknown[]) => mockBriefServiceUpdate(...args),
  },
  BriefNotFoundError: BriefNotFoundErrorStub,
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    brief: {
      findUnique: (...args: unknown[]) => mockPrismaFindUnique(...args),
    },
  },
}))

const { GET, PATCH } = await import('../route')

// ─── Helpers ───────────────────────────────────────────────────────────────

const BRIEF_ID = 'brief_001'
const PROJECT_ID = '123e4567-e89b-12d3-a456-426614174000'
const params = { params: Promise.resolve({ id: BRIEF_ID }) }

function makeGetRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/briefs/${BRIEF_ID}`)
}

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/briefs/${BRIEF_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── GET tests ─────────────────────────────────────────────────────────────

describe('GET /api/briefs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unauthenticated → 401', async () => {
    mockGetServerUser.mockResolvedValue(null)

    const res = await GET(makeGetRequest(), params)

    expect(res.status).toBe(401)
  })

  it('brief não encontrado (findById lança BriefNotFoundError) → 404', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockBriefServiceFindById.mockRejectedValue(new BriefNotFoundErrorStub())

    const res = await GET(makeGetRequest(), params)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('BRIEF_080')
  })

  it('brief não encontrado (prisma retorna null) → 404', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    const brief = { id: BRIEF_ID, projectId: PROJECT_ID, status: 'DRAFT' }
    mockBriefServiceFindById.mockResolvedValue(brief)
    mockPrismaFindUnique.mockResolvedValue(null)

    const res = await GET(makeGetRequest(), params)

    expect(res.status).toBe(404)
  })

  it('membro com acesso → 200 com brief', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    const brief = { id: BRIEF_ID, projectId: PROJECT_ID, status: 'DRAFT', sessions: [] }
    mockBriefServiceFindById.mockResolvedValue(brief)
    mockPrismaFindUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockWithProjectAccess.mockResolvedValue({ projectRole: 'DEV' })

    const res = await GET(makeGetRequest(), params)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe(BRIEF_ID)
  })

  it('sem acesso ao projeto → 403', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    const brief = { id: BRIEF_ID, projectId: PROJECT_ID, status: 'DRAFT' }
    mockBriefServiceFindById.mockResolvedValue(brief)
    mockPrismaFindUnique.mockResolvedValue({ projectId: PROJECT_ID })
    const { AppError } = await import('@/lib/errors')
    mockWithProjectAccess.mockRejectedValue(new AppError('AUTH_003', 'Sem acesso', 403))

    const res = await GET(makeGetRequest(), params)

    expect(res.status).toBe(403)
  })
})

// ─── PATCH tests ───────────────────────────────────────────────────────────

describe('PATCH /api/briefs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unauthenticated → 401', async () => {
    mockGetServerUser.mockResolvedValue(null)

    const res = await PATCH(makePatchRequest({}), params)

    expect(res.status).toBe(401)
  })

  it('payload JSON inválido → 422', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })

    const req = new NextRequest(`http://localhost/api/briefs/${BRIEF_ID}`, {
      method: 'PATCH',
      body: 'bad-json{{{',
    })
    const res = await PATCH(req, params)

    expect(res.status).toBe(422)
  })

  it('brief não encontrado → 404', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockPrismaFindUnique.mockResolvedValue(null)

    const res = await PATCH(makePatchRequest({ aiMetadata: { key: 'value' } }), params)

    expect(res.status).toBe(404)
  })

  it('PM atualiza aiMetadata → 200', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockPrismaFindUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockWithProjectAccess.mockResolvedValue({ projectRole: 'PM' })
    const updated = { id: BRIEF_ID, projectId: PROJECT_ID, status: 'DRAFT', aiMetadata: { key: 'value' } }
    mockBriefServiceUpdate.mockResolvedValue(updated)

    const res = await PATCH(makePatchRequest({ aiMetadata: { key: 'value' } }), params)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.aiMetadata).toEqual({ key: 'value' })
  })

  it('sem permissão (DEV tenta patch) → 403', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockPrismaFindUnique.mockResolvedValue({ projectId: PROJECT_ID })
    const { AppError } = await import('@/lib/errors')
    mockWithProjectAccess.mockRejectedValue(new AppError('AUTH_003', 'Sem permissão', 403))

    const res = await PATCH(makePatchRequest({ aiMetadata: {} }), params)

    expect(res.status).toBe(403)
  })

  it('BriefService.update lança erro inesperado → 500', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockPrismaFindUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockWithProjectAccess.mockResolvedValue({ projectRole: 'PM' })
    mockBriefServiceUpdate.mockRejectedValue(new Error('DB crash'))

    const res = await PATCH(makePatchRequest({ aiMetadata: {} }), params)

    expect(res.status).toBe(500)
  })
})
