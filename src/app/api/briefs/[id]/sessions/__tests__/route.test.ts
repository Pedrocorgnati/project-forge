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

class AIUnavailableErrorStub extends Error {
  constructor() {
    super('AI indisponível')
    this.name = 'AIUnavailableError'
  }
}

class SessionActiveErrorStub extends Error {
  readonly statusCode = 409
  readonly code = 'BRIEF_081'
  constructor() {
    super('Sessão já ativa.')
    this.name = 'SessionActiveError'
  }
}

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockGetServerUser = vi.fn()
const mockWithProjectAccess = vi.fn()
const mockSessionServiceStartSession = vi.fn()
const mockPriefFindUnique = vi.fn()

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: (...args: unknown[]) => mockGetServerUser(...args),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: (...args: unknown[]) => mockWithProjectAccess(...args),
}))

vi.mock('@/lib/briefforge/session-service', () => ({
  SessionService: {
    startSession: (...args: unknown[]) => mockSessionServiceStartSession(...args),
  },
}))

vi.mock('@/lib/briefforge/brief-service', () => ({
  BriefNotFoundError: BriefNotFoundErrorStub,
}))

vi.mock('@/lib/briefforge/question-selector', () => ({
  AIUnavailableError: AIUnavailableErrorStub,
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    brief: {
      findUnique: (...args: unknown[]) => mockPriefFindUnique(...args),
    },
  },
}))

const { POST } = await import('../route')

// ─── Helpers ───────────────────────────────────────────────────────────────

const BRIEF_ID = 'brief_001'
const PROJECT_ID = '123e4567-e89b-12d3-a456-426614174000'
const params = { params: Promise.resolve({ id: BRIEF_ID }) }

function makePostRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/briefs/${BRIEF_ID}/sessions`, {
    method: 'POST',
  })
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/briefs/[id]/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unauthenticated → 401', async () => {
    mockGetServerUser.mockResolvedValue(null)

    const res = await POST(makePostRequest(), params)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_001')
  })

  it('brief não encontrado (prisma retorna null) → 404', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockPriefFindUnique.mockResolvedValue(null)

    const res = await POST(makePostRequest(), params)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('BRIEF_080')
  })

  it('PM inicia sessão com sucesso → 201 com session e firstQuestion', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockPriefFindUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockWithProjectAccess.mockResolvedValue({ projectRole: 'PM' })

    const session = { id: 'session_001', briefId: BRIEF_ID, status: 'ACTIVE' }
    const firstQuestion = { id: 'q_001', order: 1, questionText: 'Qual o objetivo?' }
    mockSessionServiceStartSession.mockResolvedValue({ session, firstQuestion })

    const res = await POST(makePostRequest(), params)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.session.id).toBe('session_001')
    expect(body.data.firstQuestion.questionText).toBe('Qual o objetivo?')
    expect(mockSessionServiceStartSession).toHaveBeenCalledWith(BRIEF_ID, 'user_001')
  })

  it('AI indisponível → 503 com degraded: true', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockPriefFindUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockWithProjectAccess.mockResolvedValue({ projectRole: 'PM' })
    mockSessionServiceStartSession.mockRejectedValue(new AIUnavailableErrorStub())

    const res = await POST(makePostRequest(), params)

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error.degraded).toBe(true)
  })

  it('sessão já ativa (AppError 409) → 409', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockPriefFindUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockWithProjectAccess.mockResolvedValue({ projectRole: 'PM' })
    const { AppError } = await import('@/lib/errors')
    mockSessionServiceStartSession.mockRejectedValue(
      new AppError('BRIEF_081', 'Sessão já ativa.', 409),
    )

    const res = await POST(makePostRequest(), params)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('BRIEF_081')
  })

  it('sem permissão → 403', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockPriefFindUnique.mockResolvedValue({ projectId: PROJECT_ID })
    const { AppError } = await import('@/lib/errors')
    mockWithProjectAccess.mockRejectedValue(new AppError('AUTH_003', 'Sem permissão', 403))

    const res = await POST(makePostRequest(), params)

    expect(res.status).toBe(403)
  })

  it('erro inesperado → 500', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockPriefFindUnique.mockResolvedValue({ projectId: PROJECT_ID })
    mockWithProjectAccess.mockResolvedValue({ projectRole: 'PM' })
    mockSessionServiceStartSession.mockRejectedValue(new Error('Unexpected'))

    const res = await POST(makePostRequest(), params)

    expect(res.status).toBe(500)
  })
})
