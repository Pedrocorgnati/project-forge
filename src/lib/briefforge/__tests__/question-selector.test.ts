import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AdaptiveQuestionContext } from '@/types/briefforge'

// Mock ClaudeCliProvider before importing QuestionSelector
const mockGenerate = vi.fn()
const mockStream = vi.fn()

vi.mock('@/lib/ai/claude-cli-provider', () => ({
  ClaudeCliProvider: vi.fn().mockImplementation(() => ({
    generate: (...args: unknown[]) => mockGenerate(...args),
    stream: (...args: unknown[]) => mockStream(...args),
  })),
}))

const { QuestionSelector, AIUnavailableError } = await import('../question-selector')

const baseContext: AdaptiveQuestionContext = {
  projectName: 'Projeto Teste',
  projectDescription: 'App de gestão',
  previousQA: [],
  questionNumber: 1,
  totalExpected: 7,
}

describe('QuestionSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('selectNext', () => {
    it('AIProvider retorna string → selectNext retorna a mesma string (trimmed)', async () => {
      mockGenerate.mockResolvedValue('  Qual é o objetivo do projeto?  ')

      const result = await QuestionSelector.selectNext(baseContext)
      expect(result).toBe('Qual é o objetivo do projeto?')
    })

    it('AIProvider lança → selectNext lança AIUnavailableError', async () => {
      mockGenerate.mockRejectedValue(new Error('CLI timeout'))

      await expect(QuestionSelector.selectNext(baseContext)).rejects.toThrow(AIUnavailableError)
    })

    it('AIUnavailableError tem name correto', async () => {
      mockGenerate.mockRejectedValue(new Error('CLI timeout'))

      await expect(QuestionSelector.selectNext(baseContext)).rejects.toMatchObject({
        name: 'AIUnavailableError',
      })
    })

    it('AIProvider retorna string vazia → lança AIUnavailableError', async () => {
      mockGenerate.mockResolvedValue('   ')

      await expect(QuestionSelector.selectNext(baseContext)).rejects.toThrow(AIUnavailableError)
    })
  })

  describe('buildPrompt', () => {
    it('Contexto com 3 QA → buildPrompt inclui P1:/R1:/P2:/R2:/P3:/R3:', () => {
      const ctx: AdaptiveQuestionContext = {
        ...baseContext,
        previousQA: [
          { question: 'Qual o objetivo?', answer: 'Aumentar conversão' },
          { question: 'Qual o prazo?', answer: '3 meses' },
          { question: 'Qual o orçamento?', answer: 'R$ 50k' },
        ],
        questionNumber: 4,
      }

      const prompt = QuestionSelector.buildPrompt(ctx)

      expect(prompt).toContain('P1:')
      expect(prompt).toContain('R1:')
      expect(prompt).toContain('P2:')
      expect(prompt).toContain('R2:')
      expect(prompt).toContain('P3:')
      expect(prompt).toContain('R3:')
    })

    it('Contexto sem histórico → buildPrompt não contém "Histórico"', () => {
      const prompt = QuestionSelector.buildPrompt({ ...baseContext, previousQA: [] })

      expect(prompt).not.toContain('Histórico')
    })

    it('projectDescription vazio → não inclui seção Descrição', () => {
      const prompt = QuestionSelector.buildPrompt({ ...baseContext, projectDescription: '' })

      expect(prompt).not.toContain('Descrição:')
    })
  })

  describe('selectNextStreaming', () => {
    it('stream emite chunks e concatenados formam pergunta completa', async () => {
      async function* mockChunks() {
        yield 'Qual '
        yield 'é o '
        yield 'objetivo?'
      }
      mockStream.mockReturnValue(mockChunks())

      const chunks: string[] = []
      for await (const chunk of QuestionSelector.selectNextStreaming(baseContext)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Qual ', 'é o ', 'objetivo?'])
      expect(chunks.join('')).toBe('Qual é o objetivo?')
    })

    it('stream lança → AIUnavailableError propagada', async () => {
      async function* failingStream() {
        throw new Error('Stream connection error')
        yield ''
      }
      mockStream.mockReturnValue(failingStream())

      const gen = QuestionSelector.selectNextStreaming(baseContext)
      await expect(gen.next()).rejects.toThrow(AIUnavailableError)
    })
  })
})
