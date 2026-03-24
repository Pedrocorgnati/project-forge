import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted Mocks ─────────────────────────────────────────────────────────────

const { mockGenerate, mockStream } = vi.hoisted(() => ({
  mockGenerate: vi.fn(),
  mockStream: vi.fn(),
}))

// ─── Module Mocks ───────────────────────────────────────────────────────────────

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

vi.mock('@/lib/ai/claude-cli-provider', () => {
  return {
    ClaudeCliProvider: class MockClaudeCliProvider {
      readonly name = 'claude-cli'
      generate = mockGenerate
      stream = mockStream
      isAvailable = vi.fn().mockResolvedValue(true)
    },
  }
})

// ─── Imports (after mocks) ──────────────────────────────────────────────────────

import { SemanticSearchService } from '../semantic-search-service'
import { ContextAssembler } from '../context-assembler'
import { AnswerGenerator } from '../answer-generator'
import { EmbeddingService } from '../embedding-service'
import { prisma } from '@/lib/db'
import type { SearchResult } from '@/types/rag'

// ─── Test Data ──────────────────────────────────────────────────────────────────

const PROJECT_ID = 'proj-integration-1'
const RAG_INDEX_ID = 'idx-integration-1'
const DETERMINISTIC_VECTOR = new Array(384).fill(0.05)

const MOCK_RAW_RESULTS = [
  {
    embedding_id: 'emb-int-1',
    document_id: 'doc-int-1',
    document_title: 'README.md',
    chunk_index: 0,
    chunk_text: 'O projeto usa Next.js 14 com App Router e TypeScript.',
    similarity: '0.95',
  },
  {
    embedding_id: 'emb-int-2',
    document_id: 'doc-int-2',
    document_title: 'PRD.md',
    chunk_index: 1,
    chunk_text: 'O sistema deve suportar autenticação via Supabase Auth com magic link.',
    similarity: '0.88',
  },
  {
    embedding_id: 'emb-int-3',
    document_id: 'doc-int-3',
    document_title: 'HLD.md',
    chunk_index: 0,
    chunk_text: 'A arquitetura segue o padrão de camadas: presentation, domain, data.',
    similarity: '0.82',
  },
]

// ─── Integration Tests ──────────────────────────────────────────────────────────

describe('HandoffAI Integration — search → assemble → generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Helper: configura mocks para um fluxo de busca bem-sucedido
   */
  function setupSearchMocks(rawResults = MOCK_RAW_RESULTS) {
    vi.mocked(prisma.rAGIndex.findUnique).mockResolvedValue({
      id: RAG_INDEX_ID,
      indexationStatus: 'COMPLETE',
    } as any)

    vi.mocked(EmbeddingService.embed).mockResolvedValue({
      vector: DETERMINISTIC_VECTOR,
    })

    vi.mocked(prisma.$queryRaw).mockResolvedValue(rawResults as any)
  }

  // ─── SemanticSearchService ──────────────────────────────────────────────────

  it('SemanticSearchService.search retorna resultados para projeto com índice COMPLETE', async () => {
    setupSearchMocks()

    const results = await SemanticSearchService.search(PROJECT_ID, 'Qual o stack do projeto?')

    expect(prisma.rAGIndex.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: PROJECT_ID } }),
    )
    expect(EmbeddingService.embed).toHaveBeenCalledWith('Qual o stack do projeto?')
    expect(results).toHaveLength(3)
    expect(results[0].documentTitle).toBe('README.md')
    expect(results[0].similarity).toBe(0.95)
    expect(results[2].documentTitle).toBe('HLD.md')
  })

  // ─── ContextAssembler ───────────────────────────────────────────────────────

  it('ContextAssembler.assemble produz contexto correto a partir dos resultados', () => {
    const searchResults: SearchResult[] = MOCK_RAW_RESULTS.map((r) => ({
      embeddingId: r.embedding_id,
      documentId: r.document_id,
      documentTitle: r.document_title,
      chunkIndex: r.chunk_index,
      chunkText: r.chunk_text,
      similarity: Number(r.similarity),
    }))

    const context = ContextAssembler.assemble(searchResults)

    // Deve incluir separadores de documento
    expect(context.contextText).toContain('--- Documento: README.md ---')
    expect(context.contextText).toContain('--- Documento: PRD.md ---')
    expect(context.contextText).toContain('--- Documento: HLD.md ---')

    // Deve ter 3 sourceDocs
    expect(context.sourceDocs).toHaveLength(3)
    expect(context.sourceDocs[0].documentTitle).toBe('README.md')
    expect(context.sourceDocs[0].excerpt).toContain('Next.js')

    // contextText não deve estar vazio
    expect(context.contextText.length).toBeGreaterThan(0)
  })

  // ─── AnswerGenerator ────────────────────────────────────────────────────────

  it('AnswerGenerator.generate chama provider quando há contexto', async () => {
    const mockAnswer = 'O projeto utiliza Next.js 14 com App Router [Documento: README.md].'
    mockGenerate.mockResolvedValue(mockAnswer)

    const searchResults: SearchResult[] = [
      {
        embeddingId: 'emb-1',
        documentId: 'doc-1',
        documentTitle: 'README.md',
        chunkIndex: 0,
        chunkText: 'O projeto usa Next.js 14 com App Router.',
        similarity: 0.95,
      },
    ]

    const context = ContextAssembler.assemble(searchResults)
    const result = await AnswerGenerator.generate('Qual o stack?', context)

    expect(mockGenerate).toHaveBeenCalledTimes(1)
    expect(result.answer).toContain('Next.js')
    expect(result.hasContext).toBe(true)
    expect(result.provider).toBe('claude-cli')
  })

  it('AnswerGenerator.generate retorna NO_CONTEXT sem chamar provider quando contexto vazio', async () => {
    const emptyContext = ContextAssembler.assemble([])
    const result = await AnswerGenerator.generate('Algo sem contexto', emptyContext)

    expect(mockGenerate).not.toHaveBeenCalled()
    expect(result.answer).toContain('Não tenho informações suficientes')
    expect(result.hasContext).toBe(false)
    expect(result.provider).toBe('none')
  })

  // ─── Full Flow ──────────────────────────────────────────────────────────────

  it('fluxo completo: search → assemble → generate produz resposta coerente', async () => {
    // 1. Setup search mocks
    setupSearchMocks()

    // 2. Setup answer generator mock
    const expectedAnswer =
      'O projeto usa Next.js 14 com App Router e TypeScript [Documento: README.md]. ' +
      'A autenticação é feita via Supabase Auth [Documento: PRD.md].'
    mockGenerate.mockResolvedValue(expectedAnswer)

    // 3. Execute search
    const searchResults = await SemanticSearchService.search(
      PROJECT_ID,
      'Como funciona o projeto?',
    )
    expect(searchResults).toHaveLength(3)

    // 4. Assemble context
    const context = ContextAssembler.assemble(searchResults)
    expect(context.contextText).toContain('README.md')
    expect(context.sourceDocs.length).toBeGreaterThan(0)

    // 5. Generate answer
    const result = await AnswerGenerator.generate('Como funciona o projeto?', context)

    // 6. Verify end-to-end
    expect(result.answer).toContain('Next.js 14')
    expect(result.answer).toContain('Supabase Auth')
    expect(result.hasContext).toBe(true)
    expect(result.provider).toBe('claude-cli')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)

    // Verify the full chain was called
    expect(EmbeddingService.embed).toHaveBeenCalledTimes(1)
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
    expect(mockGenerate).toHaveBeenCalledTimes(1)

    // Verify the prompt passed to provider includes context
    const promptArg = mockGenerate.mock.calls[0][0] as string
    expect(promptArg).toContain('CONTEXTO DOS DOCUMENTOS:')
    expect(promptArg).toContain('PERGUNTA: Como funciona o projeto?')
  })

  it('fluxo completo: search sem índice → assemble vazio → generate sem provider', async () => {
    // RAGIndex não existe
    vi.mocked(prisma.rAGIndex.findUnique).mockResolvedValue(null)

    // 1. Search retorna vazio
    const searchResults = await SemanticSearchService.search(PROJECT_ID, 'query qualquer')
    expect(searchResults).toEqual([])

    // 2. Assemble com array vazio
    const context = ContextAssembler.assemble(searchResults)
    expect(context.contextText).toBe('')
    expect(context.sourceDocs).toEqual([])

    // 3. Generate sem contexto
    const result = await AnswerGenerator.generate('query qualquer', context)
    expect(result.answer).toContain('Não tenho informações suficientes')
    expect(result.hasContext).toBe(false)
    expect(mockGenerate).not.toHaveBeenCalled()
  })
})
