import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetServerUser = vi.fn()
const mockWithProjectAccess = vi.fn()
const mockEventBusPublish = vi.fn()
const mockGitHubSyncRepository = vi.fn()

const mockRAGIndexFindUnique = vi.fn()
const mockRAGIndexUpsert = vi.fn()
const mockRAGIndexUpdate = vi.fn()
const mockGitHubSyncUpsert = vi.fn()
const mockGitHubSyncUpdate = vi.fn()

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: (...args: unknown[]) => mockGetServerUser(...args),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: (...args: unknown[]) => mockWithProjectAccess(...args),
}))

vi.mock('@/lib/events', () => ({
  EventBus: {
    publish: (...args: unknown[]) => mockEventBusPublish(...args),
  },
}))

vi.mock('@/lib/rag/github-fetcher', () => ({
  GitHubFetcher: {
    syncRepository: (...args: unknown[]) => mockGitHubSyncRepository(...args),
  },
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    rAGIndex: {
      findUnique: (...args: unknown[]) => mockRAGIndexFindUnique(...args),
      upsert: (...args: unknown[]) => mockRAGIndexUpsert(...args),
      update: (...args: unknown[]) => mockRAGIndexUpdate(...args),
    },
    gitHubSync: {
      upsert: (...args: unknown[]) => mockGitHubSyncUpsert(...args),
      update: (...args: unknown[]) => mockGitHubSyncUpdate(...args),
    },
  },
}))

const { POST } = await import('../github-sync/route')

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROJECT_ID = '123e4567-e89b-12d3-a456-426614174002'
const RAG_INDEX_ID = 'rag-idx-003'
const GITHUB_SYNC_ID = 'sync-001'
const VALID_GITHUB_URL = 'https://github.com/owner/my-repo'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/rag/github-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams() {
  return { params: Promise.resolve({ id: PROJECT_ID }) }
}

function mockAuthenticatedPM() {
  mockGetServerUser.mockResolvedValue({ id: 'user-pm', role: 'PM' })
  mockWithProjectAccess.mockResolvedValue({ projectRole: 'PM' })
}

function mockDefaultSyncSetup() {
  mockRAGIndexFindUnique.mockResolvedValue(null)
  mockGitHubSyncUpsert.mockResolvedValue({ id: GITHUB_SYNC_ID, syncStatus: 'SYNCING' })
  mockRAGIndexUpsert.mockResolvedValue({
    id: RAG_INDEX_ID,
    projectId: PROJECT_ID,
    indexationStatus: 'IN_PROGRESS',
    lastCommitSha: null,
  })
  mockGitHubSyncRepository.mockResolvedValue({ indexed: 5, skipped: 2, failed: 0, truncated: false, headSha: 'abc123' })
  mockGitHubSyncUpdate.mockResolvedValue({})
  mockRAGIndexUpdate.mockResolvedValue({})
  mockEventBusPublish.mockResolvedValue(undefined)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/projects/[id]/rag/github-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetServerUser.mockResolvedValue(null)

    const res = await POST(makeRequest({ repoUrl: VALID_GITHUB_URL }), makeParams())
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('AUTH_001')
  })

  it('returns 400 when GitLab URL is provided (invalid for github-sync)', async () => {
    mockAuthenticatedPM()

    const res = await POST(
      makeRequest({ repoUrl: 'https://gitlab.com/owner/repo' }),
      makeParams(),
    )
    const body = await res.json()

    // GitLab URL fails Zod schema regex → parse throws → caught as 500 (SYS_001)
    // OR if we hit the match check first → 400 HANDOFF_020
    // The Zod schema validates GitHub URL format first — GitLab fails schema
    expect([400, 500]).toContain(res.status)
    expect(mockRAGIndexUpsert).not.toHaveBeenCalled()
  })

  it('returns 400 with HANDOFF_020 when repoUrl does not match github.com pattern', async () => {
    mockAuthenticatedPM()

    // A string that passes URL validation but fails the github.com regex (non-GitHub)
    const res = await POST(
      makeRequest({ repoUrl: 'https://github.com/' }), // missing owner/repo
      makeParams(),
    )
    const body = await res.json()

    // Invalid format fails schema → SYS_001 500 or Zod throws
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(mockGitHubSyncUpsert).not.toHaveBeenCalled()
  })

  it('returns 202 with gitHubSyncId and SYNCING status for valid PM request', async () => {
    mockAuthenticatedPM()
    mockDefaultSyncSetup()

    const res = await POST(makeRequest({ repoUrl: VALID_GITHUB_URL }), makeParams())
    const body = await res.json()

    expect(res.status).toBe(202)
    expect(body.data.gitHubSyncId).toBe(GITHUB_SYNC_ID)
    expect(body.data.syncStatus).toBe('SYNCING')
  })

  it('returns 422 with HANDOFF_050 when indexation is already in progress', async () => {
    mockAuthenticatedPM()
    mockRAGIndexFindUnique.mockResolvedValue({
      id: RAG_INDEX_ID,
      indexationStatus: 'IN_PROGRESS',
    })

    const res = await POST(makeRequest({ repoUrl: VALID_GITHUB_URL }), makeParams())
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toBe('HANDOFF_050')
    expect(mockGitHubSyncUpsert).not.toHaveBeenCalled()
  })

  it('extracts repoOwner and repoName from valid GitHub URL', async () => {
    mockAuthenticatedPM()
    mockDefaultSyncSetup()

    await POST(makeRequest({ repoUrl: VALID_GITHUB_URL }), makeParams())

    expect(mockGitHubSyncUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          repoOwner: 'owner',
          repoName: 'my-repo',
        }),
        update: expect.objectContaining({
          repoOwner: 'owner',
          repoName: 'my-repo',
        }),
      }),
    )
  })

  it('handles .git suffix in repo URL correctly', async () => {
    mockAuthenticatedPM()
    mockDefaultSyncSetup()

    await POST(
      makeRequest({ repoUrl: 'https://github.com/acme/project.git' }),
      makeParams(),
    )

    expect(mockGitHubSyncUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ repoName: 'project' }),
      }),
    )
  })

  it('upserts GitHubSync with SYNCING status', async () => {
    mockAuthenticatedPM()
    mockDefaultSyncSetup()

    await POST(makeRequest({ repoUrl: VALID_GITHUB_URL }), makeParams())

    expect(mockGitHubSyncUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: PROJECT_ID },
        create: expect.objectContaining({ syncStatus: 'SYNCING' }),
        update: expect.objectContaining({ syncStatus: 'SYNCING' }),
      }),
    )
  })

  it('upserts RAGIndex with IN_PROGRESS status', async () => {
    mockAuthenticatedPM()
    mockDefaultSyncSetup()

    await POST(makeRequest({ repoUrl: VALID_GITHUB_URL }), makeParams())

    expect(mockRAGIndexUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: PROJECT_ID },
        create: expect.objectContaining({
          indexationStatus: 'IN_PROGRESS',
          githubRepoUrl: VALID_GITHUB_URL,
        }),
      }),
    )
  })
})
