import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmbeddingService } from '../embedding-service'
import { RAG_EMBEDDING_DIMENSIONS } from '../constants'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockOpenAISuccess(dims = RAG_EMBEDDING_DIMENSIONS) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      data: [{ embedding: new Array(dims).fill(0.1) }],
      usage: { total_tokens: 4 },
    }),
  })
}

describe('EmbeddingService', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'sk-test-key'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('retorna vetor de exatamente 384 dimensões', async () => {
    mockOpenAISuccess()

    const result = await EmbeddingService.embed('test text')
    expect(result.vector).toHaveLength(RAG_EMBEDDING_DIMENSIONS)
    expect(result.tokensUsed).toBe(4)
  })

  it('envia request correto para OpenAI', async () => {
    mockOpenAISuccess()

    await EmbeddingService.embed('hello world')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test-key',
        }),
      }),
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.model).toBe('text-embedding-3-small')
    expect(body.dimensions).toBe(RAG_EMBEDDING_DIMENSIONS)
  })

  it('lança erro se OPENAI_API_KEY não configurada', async () => {
    delete process.env.OPENAI_API_KEY

    await expect(EmbeddingService.embed('test')).rejects.toThrow('OPENAI_API_KEY')
  })

  it('lança erro se OpenAI retornar dimensão incorreta', async () => {
    mockOpenAISuccess(512) // dimensão errada

    await expect(EmbeddingService.embed('test')).rejects.toThrow('Dimension mismatch')
  })

  it('lança erro para texto vazio', async () => {
    await expect(EmbeddingService.embed('   ')).rejects.toThrow('vazio')
  })

  it('lança erro se OpenAI API retornar status não-OK', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    })

    await expect(EmbeddingService.embed('test')).rejects.toThrow('429')
  })

  it('processa batch com throttle entre lotes', async () => {
    // 5 textos, batch size 2 → 3 batches
    for (let i = 0; i < 5; i++) mockOpenAISuccess()

    const texts = ['a', 'b', 'c', 'd', 'e']
    const results = await EmbeddingService.embedBatch(texts, 2)

    expect(results).toHaveLength(5)
    results.forEach((r) => expect(r.vector).toHaveLength(RAG_EMBEDDING_DIMENSIONS))
    expect(mockFetch).toHaveBeenCalledTimes(5)
  })

  it('isAvailable retorna true quando API funciona', async () => {
    mockOpenAISuccess()

    const available = await EmbeddingService.isAvailable()
    expect(available).toBe(true)
  })

  it('isAvailable retorna false quando API falha', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const available = await EmbeddingService.isAvailable()
    expect(available).toBe(false)
  })

  it('isAvailable retorna false sem OPENAI_API_KEY', async () => {
    delete process.env.OPENAI_API_KEY

    const available = await EmbeddingService.isAvailable()
    expect(available).toBe(false)
  })

  it('trunca texto maior que 8000 caracteres', async () => {
    mockOpenAISuccess()

    const longText = 'a'.repeat(10000)
    await EmbeddingService.embed(longText)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.input.length).toBe(8000)
  })
})
