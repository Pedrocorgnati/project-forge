import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetServerUser = vi.fn()
const mockWithProjectAccess = vi.fn()
const mockRAGIndexFindUnique = vi.fn()
const mockGitHubSyncFindUnique = vi.fn()

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: (...args: unknown[]) => mockGetServerUser(...args),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: (...args: unknown[]) => mockWithProjectAccess(...args),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    rAGIndex: {
      findUnique: (...args: unknown[]) => mockRAGIndexFindUnique(...args),
    },
    gitHubSync: {
      findUnique: (...args: unknown[]) => mockGitHubSyncFindUnique(...args),
    },
  },
}))

const { GET } = await import('../status/route')

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROJECT_ID = '123e4567-e89b-12d3-a456-426614174001'
const RAG_INDEX_ID = 'rag-idx-002'

function makeRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/rag/status`)
}

function makeParams() {
  return { params: Promise.resolve({ id: PROJECT_ID }) }
}

function mockAuthenticatedUser() {
  mockGetServerUser.mockResolvedValue({ id: 'user-001', role: 'DEV' })
  mockWithProjectAccess.mockResolvedValue({ projectRole: 'DEV' })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/projects/[id]/rag/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetServerUser.mockResolvedValue(null)

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('AUTH_001')
  })

  it('returns 200 with ragIndex null when project has no RAGIndex', async () => {
    mockAuthenticatedUser()
    mockRAGIndexFindUnique.mockResolvedValue(null)
    mockGitHubSyncFindUnique.mockResolvedValue(null)

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.ragIndex).toBeNull()
    expect(body.data.documents).toEqual([])
    expect(body.data.gitHubSync).toBeNull()
  })

  it('returns 200 with complete data when RAGIndex is COMPLETE', async () => {
    mockAuthenticatedUser()

    const now = new Date('2026-03-22T10:00:00Z')
    const ragIndexWithDocs = {
      id: RAG_INDEX_ID,
      projectId: PROJECT_ID,
      indexationStatus: 'COMPLETE',
      totalChunks: 42,
      lastIndexedAt: now,
      githubRepoUrl: 'https://github.com/owner/repo',
      createdAt: now,
      ragDocuments: [
        { id: 'doc-001', sourceType: 'docs', sourcePath: 'brief/project-brief', createdAt: now },
        { id: 'doc-002', sourceType: 'github', sourcePath: 'README.md', createdAt: now },
      ],
    }

    mockRAGIndexFindUnique.mockResolvedValue(ragIndexWithDocs)
    mockGitHubSyncFindUnique.mockResolvedValue(null)

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.ragIndex.id).toBe(RAG_INDEX_ID)
    expect(body.data.ragIndex.indexationStatus).toBe('COMPLETE')
    expect(body.data.ragIndex.totalChunks).toBe(42)
    expect(body.data.documents).toHaveLength(2)
    expect(body.data.documents[0].id).toBe('doc-001')
    expect(body.data.documents[1].id).toBe('doc-002')
  })

  it('returns 200 with errorMessage context when RAGIndex is FAILED', async () => {
    mockAuthenticatedUser()

    const now = new Date('2026-03-22T11:00:00Z')
    const failedIndex = {
      id: RAG_INDEX_ID,
      projectId: PROJECT_ID,
      indexationStatus: 'FAILED',
      totalChunks: 0,
      lastIndexedAt: null,
      githubRepoUrl: null,
      createdAt: now,
      ragDocuments: [],
    }

    mockRAGIndexFindUnique.mockResolvedValue(failedIndex)
    mockGitHubSyncFindUnique.mockResolvedValue(null)

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.ragIndex.indexationStatus).toBe('FAILED')
    expect(body.data.documents).toHaveLength(0)
  })

  it('returns gitHubSync data when it exists', async () => {
    mockAuthenticatedUser()

    const now = new Date('2026-03-22T12:00:00Z')
    const ragIndexWithDocs = {
      id: RAG_INDEX_ID,
      projectId: PROJECT_ID,
      indexationStatus: 'COMPLETE',
      totalChunks: 10,
      lastIndexedAt: now,
      githubRepoUrl: 'https://github.com/owner/repo',
      createdAt: now,
      ragDocuments: [],
    }

    const gitHubSyncData = {
      id: 'sync-001',
      projectId: PROJECT_ID,
      installationId: 'manual',
      repoOwner: 'owner',
      repoName: 'repo',
      syncStatus: 'IDLE',
      lastWebhookAt: now,
      createdAt: now,
      updatedAt: now,
    }

    mockRAGIndexFindUnique.mockResolvedValue(ragIndexWithDocs)
    mockGitHubSyncFindUnique.mockResolvedValue(gitHubSyncData)

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.gitHubSync).not.toBeNull()
    expect(body.data.gitHubSync.id).toBe('sync-001')
    expect(body.data.gitHubSync.repoOwner).toBe('owner')
    expect(body.data.gitHubSync.syncStatus).toBe('IDLE')
  })

  it('queries RAGIndex with ragDocuments included, ordered by createdAt asc', async () => {
    mockAuthenticatedUser()
    mockRAGIndexFindUnique.mockResolvedValue(null)
    mockGitHubSyncFindUnique.mockResolvedValue(null)

    await GET(makeRequest(), makeParams())

    expect(mockRAGIndexFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: PROJECT_ID },
        include: {
          ragDocuments: expect.objectContaining({
            orderBy: { createdAt: 'asc' },
          }),
        },
      }),
    )
  })

  it('returns 500 when database throws', async () => {
    mockAuthenticatedUser()
    mockRAGIndexFindUnique.mockRejectedValue(new Error('Connection timeout'))

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error.code).toBe('SYS_001')
  })
})
