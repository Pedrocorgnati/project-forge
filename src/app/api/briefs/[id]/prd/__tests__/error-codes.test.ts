import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PRDStatus } from '@/types/briefforge'

// ─── Error class stubs ────────────────────────────────────────────────────────

class BriefNotFoundErrorStub extends Error {
  readonly statusCode = 404
  readonly code = 'BRIEF_080'
  constructor() { super('Brief não encontrado.'); this.name = 'BriefNotFoundError' }
}

class BriefNotCompletedErrorStub extends Error {
  readonly statusCode = 422
  readonly code = 'BRIEF_083'
  constructor() { super('Brief não completado.'); this.name = 'BriefNotCompletedError' }
}

class AppErrorStub extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) { super(message); this.name = 'AppError' }
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
    constructor(msg: string) { super(msg); this.name = 'ImmutableDocumentError' }
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
  return new NextRequest(`http://localhost/api/briefs/${BRIEF_ID}/prd`, { method: 'POST' })
}
function makeGetRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/briefs/${BRIEF_ID}/prd`)
}

const briefFixture = { id: BRIEF_ID, projectId: PROJECT_ID }
const briefWithSessions = {
  ...briefFixture,
  status: 'COMPLETED',
  sessions: [{ id: 's_001', status: 'COMPLETED', questions: [] }],
}

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('Error Catalog — Autenticação/Autorização', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POST sem autenticação → 401 AUTH_001', async () => {
    mockGetServerUser.mockResolvedValue(null)
    const res = await POST(makePostRequest(), params)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_001')
  })

  it('GET sem autenticação → 401 AUTH_001', async () => {
    mockGetServerUser.mockResolvedValue(null)
    const res = await GET(makeGetRequest(), params)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_001')
  })

  it('POST usuário sem permissão → 403 AUTH_003', async () => {
    mockGetServerUser.mockResolvedValue(USER_PM)
    mockAssertBriefCompleted.mockResolvedValue(briefFixture)
    mockWithProjectAccess.mockRejectedValue(new AppErrorStub('AUTH_003', 'Acesso negado.', 403))
    const res = await POST(makePostRequest(), params)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_003')
  })
})

describe('Error Catalog — Erros de Brief', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POST brief não encontrado → 404 BRIEF_080', async () => {
    mockGetServerUser.mockResolvedValue(USER_PM)
    mockAssertBriefCompleted.mockRejectedValue(new BriefNotFoundErrorStub())
    const res = await POST(makePostRequest(), params)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('BRIEF_080')
  })

  it('POST brief DRAFT → 422 BRIEF_083 (não completado)', async () => {
    mockGetServerUser.mockResolvedValue(USER_PM)
    mockAssertBriefCompleted.mockRejectedValue(new BriefNotCompletedErrorStub())
    const res = await POST(makePostRequest(), params)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe('BRIEF_083')
  })

  it('GET brief não encontrado → 404 BRIEF_080', async () => {
    mockGetServerUser.mockResolvedValue(USER_PM)
    mockPrismaFindUnique.mockResolvedValue(null)
    const res = await GET(makeGetRequest(), params)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('BRIEF_080')
  })
})

describe('Error Catalog — Erros de PRD/Document', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerUser.mockResolvedValue(USER_PM)
    mockPrismaFindUnique.mockResolvedValue(briefFixture)
    mockWithProjectAccess.mockResolvedValue(undefined)
    mockLogAccess.mockReturnValue(undefined)
  })

  it('GET PRD não encontrado → 404 PRD_NOT_FOUND', async () => {
    mockFindLatest.mockResolvedValue(null)
    const res = await GET(makeGetRequest(), params)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('PRD_NOT_FOUND')
  })

  it('GET PRD GENERATING → 202 sem error code (status informativo)', async () => {
    mockFindLatest.mockResolvedValue({
      id: 'prd_001', briefId: BRIEF_ID, version: 1, content: '',
      generatedBy: USER_PM.id, status: PRDStatus.GENERATING, createdAt: new Date(),
    })
    const res = await GET(makeGetRequest(), params)
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.status).toBe('GENERATING')
    expect(body).not.toHaveProperty('error')
  })

  it('GET PRD ERROR → 500 PRD_GENERATION_ERROR', async () => {
    mockFindLatest.mockResolvedValue({
      id: 'prd_001', briefId: BRIEF_ID, version: 1, content: '[ERRO]',
      generatedBy: USER_PM.id, status: PRDStatus.ERROR, createdAt: new Date(),
    })
    const res = await GET(makeGetRequest(), params)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('PRD_GENERATION_ERROR')
  })
})

describe('Error Catalog — Métodos HTTP não permitidos', () => {
  it('route de PRD não expõe PATCH (→ Next.js retornaria 405)', async () => {
    const prdRoute = await import('../route')
    expect(prdRoute).not.toHaveProperty('PATCH')
  })

  it('route de PRD não expõe PUT (→ Next.js retornaria 405)', async () => {
    const prdRoute = await import('../route')
    expect(prdRoute).not.toHaveProperty('PUT')
  })

  it('route de PRD não expõe DELETE (→ Next.js retornaria 405)', async () => {
    const prdRoute = await import('../route')
    expect(prdRoute).not.toHaveProperty('DELETE')
  })
})
