import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitHubFetcher } from '../github-fetcher'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockDocumentIndexerIndexDocument = vi.fn()

const mockRAGDocumentFindMany = vi.fn()
const mockRAGDocumentCreate = vi.fn()
const mockRAGDocumentUpdate = vi.fn()
const mockRAGIndexUpdate = vi.fn()
const mockQueryRaw = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    rAGDocument: {
      findMany: (...args: unknown[]) => mockRAGDocumentFindMany(...args),
      create: (...args: unknown[]) => mockRAGDocumentCreate(...args),
      update: (...args: unknown[]) => mockRAGDocumentUpdate(...args),
    },
    rAGIndex: {
      update: (...args: unknown[]) => mockRAGIndexUpdate(...args),
    },
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}))

vi.mock('./document-indexer', () => ({
  DocumentIndexer: {
    indexDocument: (...args: unknown[]) => mockDocumentIndexerIndexDocument(...args),
  },
}))

vi.mock('../document-indexer', () => ({
  DocumentIndexer: {
    indexDocument: (...args: unknown[]) => mockDocumentIndexerIndexDocument(...args),
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RAG_INDEX_ID = 'rag-idx-001'
const REPO_OWNER = 'acme'
const REPO_NAME = 'project'
const BRANCH = 'main'
const HEAD_SHA = 'head-sha-abc'

function makeRefResponse(sha = HEAD_SHA) {
  return {
    ok: true,
    json: async () => ({ object: { sha } }),
    headers: { get: () => null },
  }
}

function makeTreeResponse(files: Array<{ path: string; sha: string; size?: number }>, truncated = false) {
  return {
    ok: true,
    json: async () => ({
      tree: files.map((f) => ({
        path: f.path,
        sha: f.sha,
        size: f.size ?? 1000,
        type: 'blob',
        url: `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs/${f.sha}`,
      })),
      truncated,
    }),
    headers: { get: () => null },
  }
}

function makeFileContentResponse(content: string) {
  const encoded = Buffer.from(content).toString('base64')
  return {
    ok: true,
    json: async () => ({ content: encoded, encoding: 'base64' }),
    headers: { get: () => null },
  }
}

function makeRateLimitResponse(retryAfterSecs?: number, remaining?: string, resetTime?: number) {
  const headers = new Map<string, string | null>()
  headers.set('Retry-After', retryAfterSecs != null ? String(retryAfterSecs) : null)
  headers.set('X-RateLimit-Remaining', remaining ?? null)
  headers.set('X-RateLimit-Reset', resetTime != null ? String(resetTime) : null)
  return {
    ok: false,
    status: 403,
    statusText: 'Forbidden',
    headers: { get: (key: string) => headers.get(key) ?? null },
    json: async () => ({ message: 'rate limited' }),
  }
}

const defaultSyncOptions = {
  ragIndexId: RAG_INDEX_ID,
  repoOwner: REPO_OWNER,
  repoName: REPO_NAME,
  branch: BRANCH,
  lastCommitSha: null,
}

// ─── isIndexable tests (existing + expanded) ─────────────────────────────────

describe('GitHubFetcher.isIndexable', () => {
  // Deve incluir
  it.each([
    'README.md',
    'src/components/Button.tsx',
    'lib/utils.ts',
    'api/routes.py',
    'config.json',
    'docs/architecture.md',
    'src/index.js',
  ])('inclui arquivo indexável: %s', (path) => {
    expect(GitHubFetcher.isIndexable(path)).toBe(true)
  })

  // Deve excluir por diretório
  it.each([
    'node_modules/react/index.js',
    '.git/config',
    'dist/bundle.js',
    'build/index.html',
    '.next/static/chunks/main.js',
  ])('exclui por diretório: %s', (path) => {
    expect(GitHubFetcher.isIndexable(path)).toBe(false)
  })

  // Deve excluir por extensão
  it.each([
    'image.png',
    'font.woff2',
    'video.mp4',
    'binary.exe',
    'archive.zip',
  ])('exclui por extensão: %s', (path) => {
    expect(GitHubFetcher.isIndexable(path)).toBe(false)
  })

  // Edge: arquivo sem extensão
  it.each(['Makefile', 'Dockerfile', 'LICENSE'])('exclui arquivo sem extensão: %s', (path) => {
    expect(GitHubFetcher.isIndexable(path)).toBe(false)
  })

  it('includes nested .md file not in excluded path', () => {
    expect(GitHubFetcher.isIndexable('docs/api/overview.md')).toBe(true)
  })

  it('excludes files in nested node_modules', () => {
    expect(GitHubFetcher.isIndexable('packages/ui/node_modules/react/index.js')).toBe(false)
  })

  it('includes .ts files in deeply nested paths', () => {
    expect(GitHubFetcher.isIndexable('src/lib/rag/document-indexer.ts')).toBe(true)
  })
})

// ─── incremental sync tests ───────────────────────────────────────────────────

describe('GitHubFetcher.syncRepository — incremental sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryRaw.mockResolvedValue([{ count: BigInt(5) }])
    mockRAGIndexUpdate.mockResolvedValue({})
  })

  it('skips file with matching SHA (incremental sync)', async () => {
    const FILE_SHA = 'file-sha-unchanged'

    mockFetch
      .mockResolvedValueOnce(makeRefResponse(HEAD_SHA))
      .mockResolvedValueOnce(makeTreeResponse([{ path: 'README.md', sha: FILE_SHA }]))

    // Existing document has same SHA
    mockRAGDocumentFindMany.mockResolvedValue([
      { id: 'doc-001', sourcePath: 'README.md', commitSha: FILE_SHA },
    ])

    const result = await GitHubFetcher.syncRepository(defaultSyncOptions)

    expect(result.skipped).toBe(1)
    expect(result.indexed).toBe(0)
    // No content fetch should happen for skipped file
    expect(mockFetch).toHaveBeenCalledTimes(2) // ref + tree only
  })

  it('reindexes file with changed SHA (incremental sync)', async () => {
    const OLD_SHA = 'sha-old'
    const NEW_SHA = 'sha-new'

    mockFetch
      .mockResolvedValueOnce(makeRefResponse(HEAD_SHA))
      .mockResolvedValueOnce(makeTreeResponse([{ path: 'README.md', sha: NEW_SHA }]))
      .mockResolvedValueOnce(makeFileContentResponse('# Updated README'))

    // Existing document has different SHA
    mockRAGDocumentFindMany.mockResolvedValue([
      { id: 'doc-001', sourcePath: 'README.md', commitSha: OLD_SHA },
    ])
    mockRAGDocumentUpdate.mockResolvedValue({ id: 'doc-001', content: '# Updated README' })
    mockDocumentIndexerIndexDocument.mockResolvedValue({ documentId: 'doc-001', chunksCreated: 1, durationMs: 10 })

    const result = await GitHubFetcher.syncRepository(defaultSyncOptions)

    expect(result.skipped).toBe(0)
    expect(result.indexed).toBe(1)
    expect(mockRAGDocumentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'doc-001' },
        data: expect.objectContaining({ commitSha: NEW_SHA }),
      }),
    )
  })

  it('creates new RAGDocument for a file that does not exist yet', async () => {
    const FILE_SHA = 'sha-new-file'

    mockFetch
      .mockResolvedValueOnce(makeRefResponse(HEAD_SHA))
      .mockResolvedValueOnce(makeTreeResponse([{ path: 'src/utils.ts', sha: FILE_SHA }]))
      .mockResolvedValueOnce(makeFileContentResponse('export const hello = () => "world"'))

    mockRAGDocumentFindMany.mockResolvedValue([]) // no existing docs
    mockRAGDocumentCreate.mockResolvedValue({ id: 'doc-new', content: '' })
    mockDocumentIndexerIndexDocument.mockResolvedValue({ documentId: 'doc-new', chunksCreated: 1, durationMs: 5 })

    const result = await GitHubFetcher.syncRepository(defaultSyncOptions)

    expect(result.indexed).toBe(1)
    expect(mockRAGDocumentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: 'github',
          sourcePath: 'src/utils.ts',
          commitSha: FILE_SHA,
        }),
      }),
    )
  })
})

// ─── rate limiting tests ──────────────────────────────────────────────────────

describe('GitHubFetcher.fetchWithRateLimit — rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('retries after Retry-After delay on 403 secondary rate limit', async () => {
    const successResponse = {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ data: 'ok' }),
    }

    // First call: 403 with Retry-After: 1
    mockFetch
      .mockResolvedValueOnce(makeRateLimitResponse(1))
      .mockResolvedValueOnce(successResponse)

    const fetchPromise = GitHubFetcher.fetchWithRateLimit(
      'https://api.github.com/test',
      {},
      'https://github.com/owner/repo',
    )

    // Advance timer to trigger retry
    await vi.runAllTimersAsync()

    const res = await fetchPromise
    expect(res.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('retries on primary rate limit when X-RateLimit-Remaining is 0', async () => {
    const futureReset = Math.floor(Date.now() / 1000) + 2 // 2 seconds from now
    const successResponse = {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ data: 'ok' }),
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: {
          get: (key: string) => {
            if (key === 'Retry-After') return null
            if (key === 'X-RateLimit-Remaining') return '0'
            if (key === 'X-RateLimit-Reset') return String(futureReset)
            return null
          },
        },
        json: async () => ({}),
      })
      .mockResolvedValueOnce(successResponse)

    const fetchPromise = GitHubFetcher.fetchWithRateLimit(
      'https://api.github.com/test',
      {},
      'https://github.com/owner/repo',
    )

    await vi.runAllTimersAsync()

    const res = await fetchPromise
    expect(res.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('throws GitHubApiUnreachableError on network error', async () => {
    vi.useRealTimers()
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(
      GitHubFetcher.fetchWithRateLimit(
        'https://api.github.com/test',
        {},
        'https://github.com/owner/repo',
      ),
    ).rejects.toMatchObject({ code: 'HANDOFF_060' })
  })

  it('throws GitHubTokenInvalidError on 401', async () => {
    vi.useRealTimers()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: { get: () => null },
    })

    await expect(
      GitHubFetcher.fetchWithRateLimit(
        'https://api.github.com/test',
        {},
        'https://github.com/owner/repo',
      ),
    ).rejects.toMatchObject({ code: 'HANDOFF_061' })
  })

  it('throws GitHubRepoNotFoundError on 404', async () => {
    vi.useRealTimers()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => null },
    })

    await expect(
      GitHubFetcher.fetchWithRateLimit(
        'https://api.github.com/test',
        {},
        'https://github.com/owner/repo',
      ),
    ).rejects.toMatchObject({ code: 'HANDOFF_062' })
  })
})

// ─── truncated tree tests ─────────────────────────────────────────────────────

describe('GitHubFetcher.syncRepository — truncated tree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockQueryRaw.mockResolvedValue([{ count: BigInt(3) }])
    mockRAGIndexUpdate.mockResolvedValue({})
  })

  it('continues with available files when tree is truncated', async () => {
    const files = [
      { path: 'README.md', sha: 'sha-1' },
      { path: 'src/index.ts', sha: 'sha-2' },
    ]

    mockFetch
      .mockResolvedValueOnce(makeRefResponse(HEAD_SHA))
      .mockResolvedValueOnce(makeTreeResponse(files, true)) // truncated = true
      .mockResolvedValueOnce(makeFileContentResponse('# README'))
      .mockResolvedValueOnce(makeFileContentResponse('export default {}'))

    mockRAGDocumentFindMany.mockResolvedValue([])
    mockRAGDocumentCreate.mockResolvedValue({ id: 'doc-001' })
    mockDocumentIndexerIndexDocument.mockResolvedValue({ documentId: 'doc-001', chunksCreated: 1, durationMs: 5 })

    const result = await GitHubFetcher.syncRepository(defaultSyncOptions)

    expect(result.truncated).toBe(true)
    expect(result.indexed).toBe(2)
    // Both available files were still indexed
  })

  it('returns truncated:false when tree is not truncated', async () => {
    mockFetch
      .mockResolvedValueOnce(makeRefResponse(HEAD_SHA))
      .mockResolvedValueOnce(makeTreeResponse([{ path: 'README.md', sha: 'sha-1' }], false))
      .mockResolvedValueOnce(makeFileContentResponse('# README'))

    mockRAGDocumentFindMany.mockResolvedValue([])
    mockRAGDocumentCreate.mockResolvedValue({ id: 'doc-001' })
    mockDocumentIndexerIndexDocument.mockResolvedValue({ documentId: 'doc-001', chunksCreated: 1, durationMs: 5 })

    const result = await GitHubFetcher.syncRepository(defaultSyncOptions)

    expect(result.truncated).toBe(false)
  })
})

// ─── general sync tests ───────────────────────────────────────────────────────

describe('GitHubFetcher.syncRepository — general', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockQueryRaw.mockResolvedValue([{ count: BigInt(0) }])
    mockRAGIndexUpdate.mockResolvedValue({})
  })

  it('returns SyncResult with indexed, skipped, failed, truncated, headSha', async () => {
    mockFetch
      .mockResolvedValueOnce(makeRefResponse(HEAD_SHA))
      .mockResolvedValueOnce(makeTreeResponse([]))

    mockRAGDocumentFindMany.mockResolvedValue([])

    const result = await GitHubFetcher.syncRepository(defaultSyncOptions)

    expect(result).toMatchObject({
      indexed: 0,
      skipped: 0,
      failed: 0,
      truncated: false,
      headSha: HEAD_SHA,
    })
  })

  it('increments failed count when file indexing throws', async () => {
    mockFetch
      .mockResolvedValueOnce(makeRefResponse(HEAD_SHA))
      .mockResolvedValueOnce(makeTreeResponse([{ path: 'README.md', sha: 'sha-1' }]))
      .mockResolvedValueOnce(makeFileContentResponse('# README'))

    mockRAGDocumentFindMany.mockResolvedValue([])
    mockRAGDocumentCreate.mockResolvedValue({ id: 'doc-001' })
    mockDocumentIndexerIndexDocument.mockRejectedValue(new Error('indexing failed'))

    const result = await GitHubFetcher.syncRepository(defaultSyncOptions)

    expect(result.failed).toBe(1)
    expect(result.indexed).toBe(0)
  })

  it('skips files with size 0', async () => {
    mockFetch
      .mockResolvedValueOnce(makeRefResponse(HEAD_SHA))
      .mockResolvedValueOnce(makeTreeResponse([{ path: 'empty.ts', sha: 'sha-1', size: 0 }]))

    mockRAGDocumentFindMany.mockResolvedValue([])

    const result = await GitHubFetcher.syncRepository(defaultSyncOptions)

    expect(result.indexed).toBe(0)
    expect(result.skipped).toBe(0)
    // File was filtered out at the indexable check (size === 0)
  })

  it('updates RAGIndex with headSha and totalChunks after sync', async () => {
    mockFetch
      .mockResolvedValueOnce(makeRefResponse(HEAD_SHA))
      .mockResolvedValueOnce(makeTreeResponse([]))

    mockRAGDocumentFindMany.mockResolvedValue([])
    mockQueryRaw.mockResolvedValue([{ count: BigInt(7) }])

    await GitHubFetcher.syncRepository(defaultSyncOptions)

    expect(mockRAGIndexUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: RAG_INDEX_ID },
        data: expect.objectContaining({
          lastCommitSha: HEAD_SHA,
          totalChunks: 7,
          githubOwner: REPO_OWNER,
          githubRepo: REPO_NAME,
        }),
      }),
    )
  })
})
