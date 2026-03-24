import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ContextAssembler } from '../context-assembler'

// Use vi.hoisted to define mocks before vi.mock hoisting
const { mockGenerate, mockStream } = vi.hoisted(() => ({
  mockGenerate: vi.fn(),
  mockStream: vi.fn(),
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

import { AnswerGenerator } from '../answer-generator'

describe('AnswerGenerator', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna NO_CONTEXT_ANSWER sem chamar provider quando contextText está vazio', async () => {
    const emptyContext = ContextAssembler.assemble([])
    const result = await AnswerGenerator.generate('alguma pergunta', emptyContext)

    expect(mockGenerate).not.toHaveBeenCalled()
    expect(result.answer).toContain('Não tenho informações suficientes')
    expect(result.hasContext).toBe(false)
    expect(result.provider).toBe('none')
  })

  it('chama provider.generate quando há contexto relevante', async () => {
    mockGenerate.mockResolvedValue(
      'O projeto usa Next.js [Documento: README.md]',
    )

    const mockContext = {
      contextText: '--- Documento: README.md ---\nUsa Next.js 14',
      sourceDocs: [
        {
          documentTitle: 'README.md',
          documentId: 'doc-1',
          chunkIndex: 0,
          excerpt: 'Usa Next.js 14...',
        },
      ],
    }

    const result = await AnswerGenerator.generate('Qual o stack?', mockContext)

    expect(mockGenerate).toHaveBeenCalledTimes(1)
    expect(result.answer).toContain('Next.js')
    expect(result.hasContext).toBe(true)
    expect(result.provider).toBe('claude-cli')
  })

  it('lança erro quando Claude falha (não retorna resposta silenciosa)', async () => {
    mockGenerate.mockRejectedValue(new Error('Claude timeout'))

    const mockContext = { contextText: 'some context', sourceDocs: [] }

    await expect(
      AnswerGenerator.generate('query', mockContext),
    ).rejects.toThrow('Failed to generate answer')
  })
})
