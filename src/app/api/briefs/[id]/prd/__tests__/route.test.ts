import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PRDStatus } from '@/types/briefforge'

// ─── Error class stubs ────────────────────────────────────────────────────────

class BriefNotFoundErrorStub extends Error {
  readonly statusCode = 404
  readonly code = 'BRIEF_080'
  constructor() {
    super('Brief não encontrado.')
    this.name = 'BriefNotFoundError'
  }
}

class BriefNotCompletedErrorStub extends Error {
  readonly statusCode = 422
  readonly code = 'BRIEF_083'
  constructor(msg?: string) {
    super(msg ?? 'Brief não está completo.')
    this.name = 'BriefNotCompletedError'
  }
}

class AppErrorStub extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerUser = vi.fn()
const mockWithProjectAccess = vi.fn()
const mockAssertBriefCompleted = vi.fn()
const mockPrismaFindUnique = vi.fn()
const mockCreateVersion = vi.fn()
const mockFindLatest = vi.fn()
const mockLogAccess = vi.fn()
const mockPRDGeneratorGenerate = vi.fn()

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: (...args: unknown[]) => mockGetServerUser(...args),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: (...args: unknown[]) => mockWithProjectAccess(...args),
}))

vi.mock('@/lib/briefforge/brief-service', () => ({
  BriefService: {
    assertBriefCompleted: (...args: unknown[]) => mockAssertBriefCompleted(...args),
  },
  BriefNotFoundError: BriefNotFoundErrorStub,
  BriefNotCompletedError: BriefNotCompletedErrorStub,
}))

vi.mock('@/lib/briefforge/document-service', () => ({
  DocumentService: {
    createVersion: (...args: unknown[]) => mockCreateVersion(...args),
    findLatest: (...args: unknown[]) => mockFindLatest(...args),
    logAccess: (...args: unknown[]) => mockLogAccess(...args),
  },
  ImmutableDocumentError: class ImmutableDocumentError extends Error {
    readonly statusCode = 422
    readonly code = 'DOC_050'
    constructor(msg: string) {
      super(msg)
      this.name = 'ImmutableDocumentError'
    }
  },
}))

vi.mock('@/lib/briefforge/prd-generator', () => ({
  PRDGenerator: {
    generate: (...args: unknown[]) => mockPRDGeneratorGenerate(...args),
  },
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    brief: {
      findUnique: (...args: unknown[]) => mockPrismaFindUnique(...args),
    },
  },
}))

vi.mock('@/lib/errors', () => ({
  AppError: AppErrorStub,
}))

const { POST, GET } = await import('../route')

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRIEF_ID = 'brief_001'
const PROJECT_ID = 'proj_001'
const USER_PM = { id: 'user_pm_001', email: 'pm@test.com' }

const params = { params: Promise.resolve({ id: BRIEF_ID }) }

function makePostRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/briefs/${BRIEF_ID}/prd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeGetRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/briefs/${BRIEF_ID}/prd`)
}

const briefFixture = { id: BRIEF_ID, projectId: PROJECT_ID, status: 'COMPLETED' }
const briefWithSessions = {
  ...briefFixture,
  sessions: [
    {
      id: 'session_001',
      status: 'COMPLETED',
      questions: [{ id: 'q_001', questionText: 'P1', answerText: 'R1' }],
    },
  ],
}

const prdDocGenerating = {
  id: 'prd_001',
  briefId: BRIEF_ID,
  version: 1,
  content: '',
  generatedBy: USER_PM.id,
  status: PRDStatus.GENERATING,
  createdAt: new Date(),
}

const prdDocReady = { ...prdDocGenerating, status: PRDStatus.READY, content: '# PRD' }
const prdDocError = { ...prdDocGenerating, status: PRDStatus.ERROR, content: '[ERRO]: timeout' }

// ─── POST /api/briefs/[id]/prd ────────────────────────────────────────────────

describe('POST /api/briefs/[id]/prd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerUser.mockResolvedValue(USER_PM)
    mockAssertBriefCompleted.mockResolvedValue(briefFixture)
    mockWithProjectAccess.mockResolvedValue(undefined)
    mockPrismaFindUnique.mockResolvedValue(briefWithSessions)
    mockCreateVersion.mockResolvedValue(prdDocGenerating)
    mockPRDGeneratorGenerate.mockResolvedValue(undefined)
  })

  it('sem autenticação → 401', async () => {
    mockGetServerUser.mockResolvedValue(null)
    const res = await POST(makePostRequest(), params)
    expect(res.status).toBe(401)
  })

  it('brief não encontrado → 404 BRIEF_080', async () => {
    mockAssertBriefCompleted.mockRejectedValue(new BriefNotFoundErrorStub())
    const res = await POST(makePostRequest(), params)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('BRIEF_080')
  })

  it('brief não completado → 422 BRIEF_083', async () => {
    mockAssertBriefCompleted.mockRejectedValue(new BriefNotCompletedErrorStub())
    const res = await POST(makePostRequest(), params)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe('BRIEF_083')
  })

  it('usuário sem permissão → 403', async () => {
    mockWithProjectAccess.mockRejectedValue(new AppErrorStub('AUTH_003', 'Acesso negado.', 403))
    const res = await POST(makePostRequest(), params)
    expect(res.status).toBe(403)
  })

  it('brief sem sessões concluídas → 422', async () => {
    mockPrismaFindUnique.mockResolvedValue({ ...briefFixture, sessions: [] })
    const res = await POST(makePostRequest(), params)
    expect(res.status).toBe(422)
  })

  it('sucesso → 202 com prdDocument GENERATING', async () => {
    const res = await POST(makePostRequest(), params)
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.data.status).toBe(PRDStatus.GENERATING)
    expect(body.data.version).toBe(1)
  })

  it('geração dispara em background (fire-and-forget)', async () => {
    await POST(makePostRequest(), params)
    expect(mockPRDGeneratorGenerate).toHaveBeenCalledWith(
      prdDocGenerating.id,
      expect.objectContaining({ sessions: expect.any(Array) }),
      USER_PM.id,
    )
  })
})

// ─── GET /api/briefs/[id]/prd ─────────────────────────────────────────────────

describe('GET /api/briefs/[id]/prd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerUser.mockResolvedValue(USER_PM)
    mockPrismaFindUnique.mockResolvedValue({ id: BRIEF_ID, projectId: PROJECT_ID })
    mockWithProjectAccess.mockResolvedValue(undefined)
    mockFindLatest.mockResolvedValue(prdDocReady)
    mockLogAccess.mockReturnValue(undefined)
  })

  it('sem autenticação → 401', async () => {
    mockGetServerUser.mockResolvedValue(null)
    const res = await GET(makeGetRequest(), params)
    expect(res.status).toBe(401)
  })

  it('brief não encontrado → 404 BRIEF_080', async () => {
    mockPrismaFindUnique.mockResolvedValue(null)
    const res = await GET(makeGetRequest(), params)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('BRIEF_080')
  })

  it('sem PRD gerado → 404 PRD_NOT_FOUND', async () => {
    mockFindLatest.mockResolvedValue(null)
    const res = await GET(makeGetRequest(), params)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('PRD_NOT_FOUND')
  })

  it('PRD GENERATING → 202 com status GENERATING', async () => {
    mockFindLatest.mockResolvedValue(prdDocGenerating)
    const res = await GET(makeGetRequest(), params)
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.status).toBe('GENERATING')
  })

  it('PRD ERROR → 500 PRD_GENERATION_ERROR', async () => {
    mockFindLatest.mockResolvedValue(prdDocError)
    const res = await GET(makeGetRequest(), params)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('PRD_GENERATION_ERROR')
  })

  it('PRD READY → 200 com content', async () => {
    const res = await GET(makeGetRequest(), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.content).toBe('# PRD')
    expect(body.data.version).toBe(1)
  })

  it('acesso ao PRD READY dispara logAccess (fire-and-forget)', async () => {
    await GET(makeGetRequest(), params)
    expect(mockLogAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: prdDocReady.id,
        accessedBy: USER_PM.id,
        action: 'VIEW',
      }),
    )
  })
})
