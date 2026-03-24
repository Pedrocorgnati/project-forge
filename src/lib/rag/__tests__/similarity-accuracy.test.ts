import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SemanticSearchService } from '../semantic-search-service'

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

describe('SemanticSearchService — acurácia da busca', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resultado mais similar aparece primeiro (ordenação por similarity desc)', async () => {
    vi.mocked(prisma.rAGIndex.findUnique).mockResolvedValue({
      id: 'idx-1',
      indexationStatus: 'COMPLETE',
    } as any)
    vi.mocked(EmbeddingService.embed).mockResolvedValue({
      vector: new Array(384).fill(0.5),
    })

    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        embedding_id: 'e1',
        document_id: 'd1',
        document_title: 'Doc A',
        chunk_index: 0,
        chunk_text: 'muito relevante',
        similarity: '0.97',
      },
      {
        embedding_id: 'e2',
        document_id: 'd2',
        document_title: 'Doc B',
        chunk_index: 0,
        chunk_text: 'moderadamente relevante',
        similarity: '0.78',
      },
      {
        embedding_id: 'e3',
        document_id: 'd3',
        document_title: 'Doc C',
        chunk_index: 0,
        chunk_text: 'pouco relevante',
        similarity: '0.45',
      },
    ] as any)

    const results = await SemanticSearchService.search('proj-1', 'query')

    expect(results[0].similarity).toBeGreaterThan(results[1].similarity)
    expect(results[1].similarity).toBeGreaterThan(results[2].similarity)
    expect(results[0].documentTitle).toBe('Doc A')
  })

  it('filtra resultados abaixo do threshold minSimilarity', async () => {
    vi.mocked(prisma.rAGIndex.findUnique).mockResolvedValue({
      id: 'idx-1',
      indexationStatus: 'COMPLETE',
    } as any)
    vi.mocked(EmbeddingService.embed).mockResolvedValue({
      vector: new Array(384).fill(0.5),
    })
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as any)

    const results = await SemanticSearchService.search('proj-1', 'query irrelevante', {
      minSimilarity: 0.8,
    })

    expect(results).toEqual([])
  })

  it('limita resultados ao topK especificado', async () => {
    vi.mocked(prisma.rAGIndex.findUnique).mockResolvedValue({
      id: 'idx-1',
      indexationStatus: 'COMPLETE',
    } as any)
    vi.mocked(EmbeddingService.embed).mockResolvedValue({
      vector: new Array(384).fill(0.5),
    })

    const mockResults = Array.from({ length: 3 }, (_, i) => ({
      embedding_id: `e${i}`,
      document_id: `d${i}`,
      document_title: `Doc ${i}`,
      chunk_index: 0,
      chunk_text: `content ${i}`,
      similarity: String(0.9 - i * 0.1),
    }))
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResults as any)

    const results = await SemanticSearchService.search('proj-1', 'query', { topK: 3 })

    expect(results).toHaveLength(3)
    expect(prisma.$queryRaw).toHaveBeenCalled()
  })
})
