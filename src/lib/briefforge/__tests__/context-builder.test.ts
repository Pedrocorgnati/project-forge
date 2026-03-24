import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma before importing ContextBuilder
const mockFindUniqueOrThrow = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
  },
}))

const { ContextBuilder } = await import('../context-builder')

describe('ContextBuilder', () => {
  const mockProject = { name: 'Projeto Teste', description: 'Descrição do projeto' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Sessão com 3 QA respondidos → questionNumber === 4', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(mockProject)

    const session = {
      questions: [
        { questionText: 'P1?', answerText: 'R1', order: 1 },
        { questionText: 'P2?', answerText: 'R2', order: 2 },
        { questionText: 'P3?', answerText: 'R3', order: 3 },
        { questionText: 'P4?', answerText: null, order: 4 },
      ],
    }

    const ctx = await ContextBuilder.build(session, 'proj_id')

    expect(ctx.previousQA).toHaveLength(3)
    expect(ctx.questionNumber).toBe(4)
    expect(ctx.totalExpected).toBe(7)
    expect(ctx.projectName).toBe('Projeto Teste')
  })

  it('Sessão com 0 respostas → previousQA vazio, questionNumber === 1', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(mockProject)

    const ctx = await ContextBuilder.build({ questions: [] }, 'proj_id')

    expect(ctx.previousQA).toHaveLength(0)
    expect(ctx.questionNumber).toBe(1)
  })

  it('Perguntas sem resposta (answerText: null) não incluídas no previousQA', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(mockProject)

    const session = {
      questions: [
        { questionText: 'P1?', answerText: 'R1', order: 1 },
        { questionText: 'P2?', answerText: null, order: 2 },
      ],
    }

    const ctx = await ContextBuilder.build(session, 'proj_id')

    expect(ctx.previousQA).toHaveLength(1)
    expect(ctx.previousQA[0].question).toBe('P1?')
  })

  it('Projeto com description: null → projectDescription: ""', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ name: 'Sem Desc', description: null })

    const ctx = await ContextBuilder.build({ questions: [] }, 'proj_id')

    expect(ctx.projectDescription).toBe('')
  })

  it('prisma.findUniqueOrThrow lança → erro propagado', async () => {
    mockFindUniqueOrThrow.mockRejectedValue(new Error('DB error'))

    await expect(ContextBuilder.build({ questions: [] }, 'proj_id')).rejects.toThrow('DB error')
  })

  it('QA ordenados por order mesmo que chegue fora de ordem', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(mockProject)

    const session = {
      questions: [
        { questionText: 'P3?', answerText: 'R3', order: 3 },
        { questionText: 'P1?', answerText: 'R1', order: 1 },
        { questionText: 'P2?', answerText: 'R2', order: 2 },
      ],
    }

    const ctx = await ContextBuilder.build(session, 'proj_id')

    expect(ctx.previousQA[0].question).toBe('P1?')
    expect(ctx.previousQA[1].question).toBe('P2?')
    expect(ctx.previousQA[2].question).toBe('P3?')
  })
})
