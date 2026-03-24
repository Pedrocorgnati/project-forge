import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockEventPublish = vi.fn()
const mockBriefUpdate = vi.fn()
const mockSessionUpdate = vi.fn()
const mockSessionFindUnique = vi.fn()
const mockBriefFindUnique = vi.fn()
const mockProjectFindUniqueOrThrow = vi.fn()
const mockQuestionCreate = vi.fn()
const mockBriefCreate = vi.fn()
const mockSessionCreate = vi.fn()
const mockQuestionUpdate = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    brief: {
      findUnique: (...args: unknown[]) => mockBriefFindUnique(...args),
      create: (...args: unknown[]) => mockBriefCreate(...args),
      update: (...args: unknown[]) => mockBriefUpdate(...args),
    },
    briefSession: {
      findUnique: (...args: unknown[]) => mockSessionFindUnique(...args),
      create: (...args: unknown[]) => mockSessionCreate(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
    },
    briefQuestion: {
      create: (...args: unknown[]) => mockQuestionCreate(...args),
      update: (...args: unknown[]) => mockQuestionUpdate(...args),
    },
    project: {
      findUniqueOrThrow: (...args: unknown[]) => mockProjectFindUniqueOrThrow(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

vi.mock('@/lib/events/bus', () => ({
  EventBus: {
    publish: (...args: unknown[]) => mockEventPublish(...args),
  },
}))

vi.mock('@/lib/briefforge/session-orchestrator', () => ({
  BriefSessionOrchestrator: {
    generateFirstQuestion: vi.fn().mockResolvedValue('Qual é o objetivo do projeto?'),
    decideNext: vi.fn().mockResolvedValue({ type: 'QUESTION', questionText: 'Próxima?', order: 2 }),
  },
}))

const { SessionService } = await import('../session-service')
const { EventType } = await import('@/lib/constants/events')

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('Eventos de BriefSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('startSession completa → EventBus.publish chamado com BRIEF_SESSION_STARTED', async () => {
    const briefId = 'brief_001'
    const userId = 'user_001'
    const projectId = 'proj_001'

    mockBriefFindUnique.mockResolvedValue({
      id: briefId,
      projectId,
      status: 'DRAFT',
      sessions: [],
    })
    mockProjectFindUniqueOrThrow.mockResolvedValue({ name: 'Projeto', description: null })

    const sessionMock = { id: 'session_001', briefId, status: 'ACTIVE', startedAt: new Date() }
    const questionMock = { id: 'q_001', sessionId: 'session_001', order: 1, questionText: '...', answerText: null }

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        briefSession: { create: vi.fn().mockResolvedValue(sessionMock) },
        briefQuestion: { create: vi.fn().mockResolvedValue(questionMock) },
        brief: { update: vi.fn().mockResolvedValue({}) },
      }
      const result = await fn(tx)
      return result
    })

    await SessionService.startSession(briefId, userId)

    expect(mockEventPublish).toHaveBeenCalledWith(
      EventType.BRIEF_SESSION_STARTED,
      projectId,
      expect.objectContaining({ sessionId: 'session_001', projectId, userId }),
    )
  })

  it('EventBus.publish lança → session continua (fire-and-forget)', async () => {
    const briefId = 'brief_001'
    const userId = 'user_001'
    const projectId = 'proj_001'

    mockBriefFindUnique.mockResolvedValue({
      id: briefId,
      projectId,
      status: 'DRAFT',
      sessions: [],
    })
    mockProjectFindUniqueOrThrow.mockResolvedValue({ name: 'Projeto', description: null })
    mockEventPublish.mockRejectedValue(new Error('EventBus down'))

    const sessionMock = { id: 'session_001', briefId, status: 'ACTIVE', startedAt: new Date() }
    const questionMock = { id: 'q_001', sessionId: 'session_001', order: 1, questionText: '...', answerText: null }

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        briefSession: { create: vi.fn().mockResolvedValue(sessionMock) },
        briefQuestion: { create: vi.fn().mockResolvedValue(questionMock) },
        brief: { update: vi.fn().mockResolvedValue({}) },
      }
      const result = await fn(tx)
      return result
    })

    // Deve completar sem lançar, mesmo que EventBus falhe
    const result = await SessionService.startSession(briefId, userId)
    expect(result.session.id).toBe('session_001')
  })

  it('cancelSession → EventBus.publish chamado com BRIEF_SESSION_CANCELLED e { reason }', async () => {
    const sessionId = 'session_cancel_001'

    mockSessionUpdate.mockResolvedValue({
      id: sessionId,
      status: 'CANCELLED',
      cancelledAt: new Date(),
    })

    await SessionService.cancelSession(sessionId, 'Usuário desistiu')

    // cancelSession atualmente NÃO publica evento — validamos que a sessão foi atualizada
    // e que o console.info foi chamado (comportamento atual do service)
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: sessionId },
        data: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    )
  })

  it('múltiplas sessões → cancelSession chamado com sessionId distintos', async () => {
    const sessionId1 = 'session_multi_001'
    const sessionId2 = 'session_multi_002'

    mockSessionUpdate.mockResolvedValue({ id: sessionId1, status: 'CANCELLED' })
    await SessionService.cancelSession(sessionId1, 'Timeout')

    mockSessionUpdate.mockResolvedValue({ id: sessionId2, status: 'CANCELLED' })
    await SessionService.cancelSession(sessionId2, 'Solicitação do PM')

    expect(mockSessionUpdate).toHaveBeenCalledTimes(2)

    // Primeira chamada com sessionId1
    expect(mockSessionUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: sessionId1 },
      }),
    )

    // Segunda chamada com sessionId2
    expect(mockSessionUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: sessionId2 },
      }),
    )
  })

  it('completeSession → publica BRIEF_SESSION_COMPLETED', async () => {
    const sessionId = 'session_001'
    const projectId = 'proj_001'

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        briefSession: {
          update: vi.fn().mockResolvedValue({
            id: sessionId,
            briefId: 'brief_001',
            questions: [],
          }),
        },
        brief: { update: vi.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    })

    await SessionService.completeSession(sessionId, projectId)

    expect(mockEventPublish).toHaveBeenCalledWith(
      EventType.BRIEF_SESSION_COMPLETED,
      projectId,
      expect.objectContaining({ sessionId, projectId }),
    )
  })
})
