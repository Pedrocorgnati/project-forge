import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SemanticSearchService } from '../semantic-search-service'

// Mock dependencies
vi.mock('../embedding-service', () => ({
  EmbeddingService: {
    embed: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    rAGIndex: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

import { EmbeddingService } from '../embedding-service'
import { prisma } from '@/lib/db'

describe('SemanticSearchService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna array vazio quando RAGIndex não está COMPLETE', async () => {
    vi.mocked(prisma.rAGIndex.findUnique).mockResolvedValue({
      id: 'idx-1',
      indexationStatus: 'PENDING',
    } as any)

    const results = await SemanticSearchService.search('proj-1', 'qualquer coisa')

    expect(results).toEqual([])
    expect(EmbeddingService.embed).not.toHaveBeenCalled()
  })

  it('retorna array vazio quando RAGIndex não existe', async () => {
    vi.mocked(prisma.rAGIndex.findUnique).mockResolvedValue(null)

    const results = await SemanticSearchService.search('proj-1', 'query')

    expect(results).toEqual([])
  })

  it('executa similarity search e retorna top-K resultados formatados', async () => {
    vi.mocked(prisma.rAGIndex.findUnique).mockResolvedValue({
      id: 'idx-1',
      indexationStatus: 'COMPLETE',
    } as any)
    vi.mocked(EmbeddingService.embed).mockResolvedValue({
      vector: new Array(384).fill(0.1),
    })
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        embedding_id: 'emb-1',
        document_id: 'doc-1',
        document_title: 'README.md',
        chunk_index: 0,
        chunk_text: 'texto relevante',
        similarity: '0.92',
      },
    ] as any)

    const results = await SemanticSearchService.search('proj-1', 'query test')

    expect(results).toHaveLength(1)
    expect(results[0].similarity).toBe(0.92)
    expect(results[0].documentTitle).toBe('README.md')
  })

  it('hasIndex retorna false quando RAGIndex não existe', async () => {
    vi.mocked(prisma.rAGIndex.findUnique).mockResolvedValue(null)
    expect(await SemanticSearchService.hasIndex('proj-1')).toBe(false)
  })

  it('hasIndex retorna true quando RAGIndex está COMPLETE', async () => {
    vi.mocked(prisma.rAGIndex.findUnique).mockResolvedValue({
      indexationStatus: 'COMPLETE',
    } as any)
    expect(await SemanticSearchService.hasIndex('proj-1')).toBe(true)
  })

  it('hasIndex retorna false quando RAGIndex está IN_PROGRESS', async () => {
    vi.mocked(prisma.rAGIndex.findUnique).mockResolvedValue({
      indexationStatus: 'IN_PROGRESS',
    } as any)
    expect(await SemanticSearchService.hasIndex('proj-1')).toBe(false)
  })
})
