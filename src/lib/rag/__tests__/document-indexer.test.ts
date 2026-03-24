import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockEmbedBatch = vi.fn()
const mockInsertEmbedding = vi.fn()
const mockDeleteEmbeddingsByIndex = vi.fn()
const mockChunk = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {},
}))

vi.mock('@/lib/rag/embedding-service', () => ({
  EmbeddingService: {
    embed: vi.fn(),
    embedBatch: (...args: unknown[]) => mockEmbedBatch(...args),
  },
}))

vi.mock('@/lib/db/embeddings', () => ({
  insertEmbedding: (...args: unknown[]) => mockInsertEmbedding(...args),
  deleteEmbeddingsByIndex: (...args: unknown[]) => mockDeleteEmbeddingsByIndex(...args),
}))

vi.mock('@/lib/rag/document-chunker', () => ({
  DocumentChunker: {
    chunk: (...args: unknown[]) => mockChunk(...args),
  },
}))

const { DocumentIndexer } = await import('../document-indexer')

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FAKE_VECTOR = new Array(384).fill(0.1)

function makeDoc(overrides: Partial<{
  ragIndexId: string
  ragDocumentId: string
  sourcePath: string
  content: string
  commitSha: string
}> = {}) {
  return {
    ragIndexId: 'idx-001',
    ragDocumentId: 'doc-001',
    sourcePath: 'docs/readme.md',
    content: 'some content',
    commitSha: 'abc123',
    ...overrides,
  }
}

function makeChunk(index: number, text: string) {
  return { index, text, charStart: index * 100, charEnd: (index + 1) * 100 }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DocumentIndexer.indexDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('indexes a 2500-char document producing 3 chunks', async () => {
    const chunks = [makeChunk(0, 'chunk 0'), makeChunk(1, 'chunk 1'), makeChunk(2, 'chunk 2')]
    mockChunk.mockReturnValue(chunks)
    mockEmbedBatch.mockResolvedValue([
      { vector: FAKE_VECTOR },
      { vector: FAKE_VECTOR },
      { vector: FAKE_VECTOR },
    ])
    mockInsertEmbedding.mockResolvedValue('embed-id')

    const result = await DocumentIndexer.indexDocument(makeDoc({ content: 'x'.repeat(2500) }))

    expect(result.chunksCreated).toBe(3)
    expect(result.documentId).toBe('doc-001')
    expect(result.error).toBeUndefined()
    expect(mockInsertEmbedding).toHaveBeenCalledTimes(3)
  })

  it('returns 0 chunks for empty document', async () => {
    mockChunk.mockReturnValue([])

    const result = await DocumentIndexer.indexDocument(makeDoc({ content: '' }))

    expect(result.chunksCreated).toBe(0)
    expect(result.documentId).toBe('doc-001')
    expect(result.error).toBeUndefined()
    expect(mockEmbedBatch).not.toHaveBeenCalled()
    expect(mockInsertEmbedding).not.toHaveBeenCalled()
  })

  it('continues processing remaining chunks when one chunk insertion fails', async () => {
    const chunks = [makeChunk(0, 'chunk 0'), makeChunk(1, 'chunk 1'), makeChunk(2, 'chunk 2')]
    mockChunk.mockReturnValue(chunks)
    mockEmbedBatch.mockResolvedValue([
      { vector: FAKE_VECTOR },
      { vector: FAKE_VECTOR },
      { vector: FAKE_VECTOR },
    ])
    // Second chunk fails, others succeed
    mockInsertEmbedding
      .mockResolvedValueOnce('embed-id-0')
      .mockRejectedValueOnce(new Error('DB constraint error'))
      .mockResolvedValueOnce('embed-id-2')

    const result = await DocumentIndexer.indexDocument(makeDoc())

    expect(result.chunksCreated).toBe(2)
    expect(result.documentId).toBe('doc-001')
    expect(result.error).toBeUndefined()
    expect(mockInsertEmbedding).toHaveBeenCalledTimes(3)
  })

  it('returns error when embedBatch throws (entire pipeline failure)', async () => {
    mockChunk.mockReturnValue([makeChunk(0, 'chunk 0')])
    mockEmbedBatch.mockRejectedValue(new Error('OpenAI API unavailable'))

    const result = await DocumentIndexer.indexDocument(makeDoc())

    expect(result.chunksCreated).toBe(0)
    expect(result.error).toBe('OpenAI API unavailable')
    expect(mockInsertEmbedding).not.toHaveBeenCalled()
  })

  it('passes commitSha to insertEmbedding', async () => {
    mockChunk.mockReturnValue([makeChunk(0, 'chunk text')])
    mockEmbedBatch.mockResolvedValue([{ vector: FAKE_VECTOR }])
    mockInsertEmbedding.mockResolvedValue('embed-id')

    await DocumentIndexer.indexDocument(makeDoc({ commitSha: 'sha-xyz' }))

    expect(mockInsertEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({ commitSha: 'sha-xyz' }),
    )
  })

  it('uses "manual" as commitSha when not provided', async () => {
    mockChunk.mockReturnValue([makeChunk(0, 'chunk text')])
    mockEmbedBatch.mockResolvedValue([{ vector: FAKE_VECTOR }])
    mockInsertEmbedding.mockResolvedValue('embed-id')

    const doc = makeDoc()
    delete (doc as Record<string, unknown>).commitSha
    await DocumentIndexer.indexDocument(doc)

    expect(mockInsertEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({ commitSha: 'manual' }),
    )
  })

  it('includes correct metadata (chunkIndex, totalChunks, charStart, charEnd)', async () => {
    const chunks = [makeChunk(0, 'first'), makeChunk(1, 'second')]
    mockChunk.mockReturnValue(chunks)
    mockEmbedBatch.mockResolvedValue([{ vector: FAKE_VECTOR }, { vector: FAKE_VECTOR }])
    mockInsertEmbedding.mockResolvedValue('embed-id')

    await DocumentIndexer.indexDocument(makeDoc())

    expect(mockInsertEmbedding).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        metadata: { chunkIndex: 0, totalChunks: 2, charStart: 0, charEnd: 100 },
      }),
    )
    expect(mockInsertEmbedding).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        metadata: { chunkIndex: 1, totalChunks: 2, charStart: 100, charEnd: 200 },
      }),
    )
  })
})

describe('DocumentIndexer.indexAll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns IndexResult array for 3 documents', async () => {
    mockDeleteEmbeddingsByIndex.mockResolvedValue(0)
    mockChunk.mockReturnValue([makeChunk(0, 'chunk')])
    mockEmbedBatch.mockResolvedValue([{ vector: FAKE_VECTOR }])
    mockInsertEmbedding.mockResolvedValue('embed-id')

    const docs = [
      makeDoc({ ragDocumentId: 'doc-001' }),
      makeDoc({ ragDocumentId: 'doc-002' }),
      makeDoc({ ragDocumentId: 'doc-003' }),
    ]

    const results = await DocumentIndexer.indexAll('idx-001', docs)

    expect(results).toHaveLength(3)
    expect(results[0].documentId).toBe('doc-001')
    expect(results[1].documentId).toBe('doc-002')
    expect(results[2].documentId).toBe('doc-003')
  })

  it('calls deleteEmbeddingsByIndex before indexing', async () => {
    mockDeleteEmbeddingsByIndex.mockResolvedValue(5)
    mockChunk.mockReturnValue([])

    await DocumentIndexer.indexAll('idx-001', [makeDoc()])

    expect(mockDeleteEmbeddingsByIndex).toHaveBeenCalledWith('idx-001')
    expect(mockDeleteEmbeddingsByIndex).toHaveBeenCalledTimes(1)
  })

  it('calls onProgress callback with correct counters', async () => {
    mockDeleteEmbeddingsByIndex.mockResolvedValue(0)
    mockChunk.mockReturnValue([])

    const onProgress = vi.fn().mockResolvedValue(undefined)
    const docs = [makeDoc({ ragDocumentId: 'doc-001' }), makeDoc({ ragDocumentId: 'doc-002' })]

    await DocumentIndexer.indexAll('idx-001', docs, onProgress)

    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2)
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2)
  })

  it('returns empty array for empty document list', async () => {
    mockDeleteEmbeddingsByIndex.mockResolvedValue(0)

    const results = await DocumentIndexer.indexAll('idx-001', [])

    expect(results).toEqual([])
    expect(mockDeleteEmbeddingsByIndex).toHaveBeenCalledWith('idx-001')
  })

  it('aggregates results including errors without aborting', async () => {
    mockDeleteEmbeddingsByIndex.mockResolvedValue(0)
    // First doc: success
    mockChunk
      .mockReturnValueOnce([makeChunk(0, 'chunk')])
      // Second doc: embedBatch will throw → returned as error result
      .mockReturnValueOnce([makeChunk(0, 'chunk')])
    mockEmbedBatch
      .mockResolvedValueOnce([{ vector: FAKE_VECTOR }])
      .mockRejectedValueOnce(new Error('embed failure'))
    mockInsertEmbedding.mockResolvedValue('embed-id')

    const docs = [
      makeDoc({ ragDocumentId: 'doc-001' }),
      makeDoc({ ragDocumentId: 'doc-002' }),
    ]

    const results = await DocumentIndexer.indexAll('idx-001', docs)

    expect(results).toHaveLength(2)
    expect(results[0].chunksCreated).toBe(1)
    expect(results[0].error).toBeUndefined()
    expect(results[1].chunksCreated).toBe(0)
    expect(results[1].error).toBe('embed failure')
  })
})
