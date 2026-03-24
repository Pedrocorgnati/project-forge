import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Error class stubs (must match what route imports) ─────────────────────

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
const mockBriefServiceCreate = vi.fn()

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: (...args: unknown[]) => mockGetServerUser(...args),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: (...args: unknown[]) => mockWithProjectAccess(...args),
}))

vi.mock('@/lib/briefforge/brief-service', () => ({
  BriefService: {
    create: (...args: unknown[]) => mockBriefServiceCreate(...args),
  },
  BriefNotFoundError: BriefNotFoundErrorStub,
}))

const { POST } = await import('../route')

// ─── Helpers ───────────────────────────────────────────────────────────────

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/briefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/briefs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unauthenticated → 401 com AUTH_001', async () => {
    mockGetServerUser.mockResolvedValue(null)

    const res = await POST(makePostRequest({ projectId: VALID_UUID }))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_001')
  })

  it('payload JSON inválido → 422', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })

    const req = new NextRequest('http://localhost/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    })

    const res = await POST(req)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe('VAL_001')
  })

  it('projectId ausente → 422', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })

    const res = await POST(makePostRequest({}))

    expect(res.status).toBe(422)
  })

  it('projectId não UUID → 422', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })

    const res = await POST(makePostRequest({ projectId: 'not-a-uuid' }))

    expect(res.status).toBe(422)
  })

  it('PM cria brief → 201 com brief no body', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockWithProjectAccess.mockResolvedValue({ projectRole: 'PM' })
    const brief = { id: 'brief_001', projectId: VALID_UUID, status: 'DRAFT' }
    mockBriefServiceCreate.mockResolvedValue(brief)

    const res = await POST(makePostRequest({ projectId: VALID_UUID }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data).toEqual(brief)
    expect(mockBriefServiceCreate).toHaveBeenCalledWith({ projectId: VALID_UUID })
  })

  it('withProjectAccess lança AppError 403 → 403', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    const { AppError } = await import('@/lib/errors')
    mockWithProjectAccess.mockRejectedValue(new AppError('AUTH_003', 'Sem acesso', 403))

    const res = await POST(makePostRequest({ projectId: VALID_UUID }))

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_003')
  })

  it('BriefService.create lança erro inesperado → 500', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockWithProjectAccess.mockResolvedValue({ projectRole: 'PM' })
    mockBriefServiceCreate.mockRejectedValue(new Error('DB crash'))

    const res = await POST(makePostRequest({ projectId: VALID_UUID }))

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('SYS_500')
  })
})
