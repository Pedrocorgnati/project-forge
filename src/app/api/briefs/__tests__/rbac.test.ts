import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── RBAC Matrix Tests ─────────────────────────────────────────────────────
//
// Endpoints testados:
//   [W1] POST /api/briefs              — requer PM+
//   [W2] PATCH /api/briefs/[id]        — requer PM+
//   [W3] POST /api/briefs/[id]/sessions — requer PM+
//   [R1] GET /api/briefs/[id]          — qualquer membro
//
// Matrix:
//         W1    W2    W3    R1
//  SOCIO  ✓     ✓     ✓     ✓
//  PM     ✓     ✓     ✓     ✓
//  DEV    ✗     ✗     ✗     ✓
//  CLIENTE ✗    ✗     ✗     ✓

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

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockGetServerUser = vi.fn()
const mockWithProjectAccess = vi.fn()
const mockBriefServiceCreate = vi.fn()
const mockBriefServiceFindById = vi.fn()
const mockBriefServiceUpdate = vi.fn()
const mockSessionServiceStartSession = vi.fn()
const mockPrismaFindUnique = vi.fn()

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: (...args: unknown[]) => mockGetServerUser(...args),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: (...args: unknown[]) => mockWithProjectAccess(...args),
}))

vi.mock('@/lib/briefforge/brief-service', () => ({
  BriefService: {
    create: (...args: unknown[]) => mockBriefServiceCreate(...args),
    findById: (...args: unknown[]) => mockBriefServiceFindById(...args),
    update: (...args: unknown[]) => mockBriefServiceUpdate(...args),
  },
  BriefNotFoundError: BriefNotFoundErrorStub,
}))

vi.mock('@/lib/briefforge/session-service', () => ({
  SessionService: {
    startSession: (...args: unknown[]) => mockSessionServiceStartSession(...args),
  },
}))

vi.mock('@/lib/briefforge/question-selector', () => ({
  AIUnavailableError: AIUnavailableErrorStub,
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    brief: {
      findUnique: (...args: unknown[]) => mockPrismaFindUnique(...args),
    },
  },
}))

// Dynamic imports after mocks
const { POST: createBrief } = await import('../route')
const { GET: getBrief, PATCH: patchBrief } = await import('../[id]/route')
const { POST: startSession } = await import('../[id]/sessions/route')

// ─── Helpers ───────────────────────────────────────────────────────────────

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'
const PROJECT_ID = VALID_UUID
const BRIEF_ID = 'brief_001'
const SESSION_PARAMS = { params: Promise.resolve({ id: BRIEF_ID }) }

function makeUser(id: string) {
  return { id }
}

function mockPMAccess() {
  mockWithProjectAccess.mockResolvedValue({ projectRole: 'PM' })
}

function mockAccessDenied() {
  const { AppError } = require('@/lib/errors') as typeof import('@/lib/errors')
  mockWithProjectAccess.mockRejectedValue(new AppError('AUTH_003', 'Sem permissão', 403))
}

function mockAnyMemberAccess() {
  mockWithProjectAccess.mockResolvedValue({ projectRole: 'DEV' })
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('RBAC Matrix — Endpoints de Brief', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: brief exists in DB
    mockPrismaFindUnique.mockResolvedValue({ projectId: PROJECT_ID })
    // Default: happy-path service returns
    mockBriefServiceCreate.mockResolvedValue({ id: BRIEF_ID, projectId: PROJECT_ID, status: 'DRAFT' })
    mockBriefServiceFindById.mockResolvedValue({ id: BRIEF_ID, projectId: PROJECT_ID, status: 'DRAFT' })
    mockBriefServiceUpdate.mockResolvedValue({ id: BRIEF_ID, projectId: PROJECT_ID, status: 'DRAFT' })
    mockSessionServiceStartSession.mockResolvedValue({
      session: { id: 'session_001', briefId: BRIEF_ID, status: 'ACTIVE' },
      firstQuestion: { id: 'q_001', order: 1, questionText: 'Qual o objetivo?' },
    })
  })

  // ── W1: POST /api/briefs ────────────────────────────────────────────────

  describe('[W1] POST /api/briefs — requer PM+', () => {
    const req = () =>
      new NextRequest('http://localhost/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: VALID_UUID }),
      })

    it('SOCIO → 201', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('socio_001'))
      mockPMAccess()
      const res = await createBrief(req())
      expect(res.status).toBe(201)
    })

    it('PM → 201', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('pm_001'))
      mockPMAccess()
      const res = await createBrief(req())
      expect(res.status).toBe(201)
    })

    it('DEV → 403', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('dev_001'))
      mockAccessDenied()
      const res = await createBrief(req())
      expect(res.status).toBe(403)
    })

    it('CLIENTE → 403', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('cliente_001'))
      mockAccessDenied()
      const res = await createBrief(req())
      expect(res.status).toBe(403)
    })
  })

  // ── W2: PATCH /api/briefs/[id] ─────────────────────────────────────────

  describe('[W2] PATCH /api/briefs/[id] — requer PM+', () => {
    const req = () =>
      new NextRequest(`http://localhost/api/briefs/${BRIEF_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiMetadata: { key: 'value' } }),
      })

    it('SOCIO → 200', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('socio_001'))
      mockPMAccess()
      const res = await patchBrief(req(), SESSION_PARAMS)
      expect(res.status).toBe(200)
    })

    it('PM → 200', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('pm_001'))
      mockPMAccess()
      const res = await patchBrief(req(), SESSION_PARAMS)
      expect(res.status).toBe(200)
    })

    it('DEV → 403', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('dev_001'))
      mockAccessDenied()
      const res = await patchBrief(req(), SESSION_PARAMS)
      expect(res.status).toBe(403)
    })

    it('CLIENTE → 403', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('cliente_001'))
      mockAccessDenied()
      const res = await patchBrief(req(), SESSION_PARAMS)
      expect(res.status).toBe(403)
    })
  })

  // ── W3: POST /api/briefs/[id]/sessions ────────────────────────────────

  describe('[W3] POST /api/briefs/[id]/sessions — requer PM+', () => {
    const req = () =>
      new NextRequest(`http://localhost/api/briefs/${BRIEF_ID}/sessions`, {
        method: 'POST',
      })

    it('SOCIO → 201', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('socio_001'))
      mockPMAccess()
      const res = await startSession(req(), SESSION_PARAMS)
      expect(res.status).toBe(201)
    })

    it('PM → 201', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('pm_001'))
      mockPMAccess()
      const res = await startSession(req(), SESSION_PARAMS)
      expect(res.status).toBe(201)
    })

    it('DEV → 403', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('dev_001'))
      mockAccessDenied()
      const res = await startSession(req(), SESSION_PARAMS)
      expect(res.status).toBe(403)
    })

    it('CLIENTE → 403', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('cliente_001'))
      mockAccessDenied()
      const res = await startSession(req(), SESSION_PARAMS)
      expect(res.status).toBe(403)
    })
  })

  // ── R1: GET /api/briefs/[id] — qualquer membro ─────────────────────────

  describe('[R1] GET /api/briefs/[id] — qualquer membro', () => {
    const req = () => new NextRequest(`http://localhost/api/briefs/${BRIEF_ID}`)

    it('SOCIO → 200', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('socio_001'))
      mockAnyMemberAccess()
      const res = await getBrief(req(), SESSION_PARAMS)
      expect(res.status).toBe(200)
    })

    it('PM → 200', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('pm_001'))
      mockAnyMemberAccess()
      const res = await getBrief(req(), SESSION_PARAMS)
      expect(res.status).toBe(200)
    })

    it('DEV → 200 (leitura permitida)', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('dev_001'))
      mockAnyMemberAccess()
      const res = await getBrief(req(), SESSION_PARAMS)
      expect(res.status).toBe(200)
    })

    it('CLIENTE → 200 (leitura permitida)', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('cliente_001'))
      mockAnyMemberAccess()
      const res = await getBrief(req(), SESSION_PARAMS)
      expect(res.status).toBe(200)
    })

    it('não membro → 403', async () => {
      mockGetServerUser.mockResolvedValue(makeUser('stranger_001'))
      const { AppError } = await import('@/lib/errors')
      mockWithProjectAccess.mockRejectedValue(new AppError('AUTH_003', 'Sem acesso', 403))
      const res = await getBrief(req(), SESSION_PARAMS)
      expect(res.status).toBe(403)
    })
  })
})
