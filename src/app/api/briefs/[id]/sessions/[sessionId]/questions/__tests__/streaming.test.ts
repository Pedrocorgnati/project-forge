import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Error class stubs ──────────────────────────────────────────────────────

class AIUnavailableErrorStub extends Error {
  constructor() {
    super('AI indisponível')
    this.name = 'AIUnavailableError'
  }
}

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockGetServerUser = vi.fn()
const mockWithProjectAccess = vi.fn()
const mockSessionServiceFindById = vi.fn()
const mockSessionServiceCompleteSession = vi.fn()
const mockSelectNextStreaming = vi.fn()
const mockContextBuilderBuild = vi.fn()
const mockPrismaQuestionUpdate = vi.fn()
const mockPrismaQuestionCreate = vi.fn()
const mockPrismaQuestionDelete = vi.fn()
const mockPrismaSessionFindUniqueOrThrow = vi.fn()

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: (...args: unknown[]) => mockGetServerUser(...args),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: (...args: unknown[]) => mockWithProjectAccess(...args),
}))

vi.mock('@/lib/briefforge/session-service', () => ({
  SessionService: {
    findById: (...args: unknown[]) => mockSessionServiceFindById(...args),
    completeSession: (...args: unknown[]) => mockSessionServiceCompleteSession(...args),
  },
}))

vi.mock('@/lib/briefforge/session-orchestrator', () => ({
  BriefSessionOrchestrator: {
    decideNext: vi.fn(),
    decideNextStreaming: vi.fn(),
  },
}))

vi.mock('@/lib/briefforge/question-selector', () => ({
  QuestionSelector: {
    selectNextStreaming: (...args: unknown[]) => mockSelectNextStreaming(...args),
  },
  AIUnavailableError: AIUnavailableErrorStub,
}))

vi.mock('@/lib/briefforge/session-state-machine', () => ({
  SessionStateMachine: {
    shouldComplete: vi.fn().mockReturnValue(false),
    canContinue: vi.fn().mockReturnValue(true),
    assertTransition: vi.fn(),
  },
  MAX_QUESTIONS: 7,
}))

vi.mock('@/lib/briefforge/context-builder', () => ({
  ContextBuilder: {
    build: (...args: unknown[]) => mockContextBuilderBuild(...args),
  },
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    briefQuestion: {
      update: (...args: unknown[]) => mockPrismaQuestionUpdate(...args),
      create: (...args: unknown[]) => mockPrismaQuestionCreate(...args),
      delete: (...args: unknown[]) => mockPrismaQuestionDelete(...args),
    },
    briefSession: {
      findUniqueOrThrow: (...args: unknown[]) => mockPrismaSessionFindUniqueOrThrow(...args),
    },
  },
}))

const { POST } = await import('../route')

// ─── Helpers ───────────────────────────────────────────────────────────────

const BRIEF_ID = 'brief_001'
const SESSION_ID = 'session_001'
const QUESTION_ID = 'q_001'
const PROJECT_ID = '123e4567-e89b-12d3-a456-426614174000'

const params = { params: Promise.resolve({ id: BRIEF_ID, sessionId: SESSION_ID }) }

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest(
    `http://localhost/api/briefs/${BRIEF_ID}/sessions/${SESSION_ID}/questions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
}

function makeActiveSession(questionCount = 1) {
  return {
    id: SESSION_ID,
    status: 'ACTIVE',
    brief: { projectId: PROJECT_ID },
    questions: Array.from({ length: questionCount }, (_, i) => ({
      id: `q_00${i + 1}`,
      order: i + 1,
      questionText: `Pergunta ${i + 1}?`,
      answerText: i < questionCount - 1 ? `Resposta ${i + 1}` : null,
    })),
  }
}

async function* makeChunkGenerator(...chunks: string[]) {
  for (const chunk of chunks) {
    yield chunk
  }
}

async function readSSEStream(res: Response): Promise<string[]> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  const chunks: string[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(decoder.decode(value))
  }
  return chunks
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('POST .../questions — Streaming de perguntas IA (SSE)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerUser.mockResolvedValue({ id: 'user_001' })
    mockWithProjectAccess.mockResolvedValue({ projectRole: 'PM' })
    mockPrismaQuestionUpdate.mockResolvedValue({})
    mockPrismaQuestionCreate.mockResolvedValue({ id: 'q_new', order: 2 })
    mockPrismaQuestionDelete.mockResolvedValue({})
    mockContextBuilderBuild.mockResolvedValue({
      projectName: 'Projeto Teste',
      projectDescription: 'Desc',
      previousQA: [],
      questionNumber: 2,
      totalExpected: 7,
    })
  })

  it('unauthenticated → 401', async () => {
    mockGetServerUser.mockResolvedValue(null)
    const res = await POST(makePostRequest({ questionId: QUESTION_ID, answer: 'Resposta válida com mais de 10 chars' }), params)
    expect(res.status).toBe(401)
  })

  it('resposta muito curta (< 10 chars) → 422', async () => {
    const res = await POST(makePostRequest({ questionId: QUESTION_ID, answer: 'curta' }), params)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe('VAL_001')
  })

  it('resposta muito longa (> 2000 chars) → 422', async () => {
    const longAnswer = 'x'.repeat(2001)
    const res = await POST(makePostRequest({ questionId: QUESTION_ID, answer: longAnswer }), params)
    expect(res.status).toBe(422)
  })

  it('questionId inválido (não UUID) → 422', async () => {
    const res = await POST(
      makePostRequest({ questionId: 'not-a-uuid', answer: 'Resposta válida aqui' }),
      params,
    )
    expect(res.status).toBe(422)
  })

  it('sessão não ACTIVE → 422 com BRIEF_084', async () => {
    const completedSession = { ...makeActiveSession(), status: 'COMPLETED' }
    mockSessionServiceFindById.mockResolvedValue(completedSession)

    const validAnswer = 'Esta é uma resposta válida com mais de 10 chars'
    const res = await POST(makePostRequest({ questionId: QUESTION_ID, answer: validAnswer }), params)

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe('BRIEF_084')
  })

  it('resposta válida → Content-Type: text/event-stream', async () => {
    const session = makeActiveSession()
    mockSessionServiceFindById.mockResolvedValue(session)

    // Mock updatedSession after answer
    const updatedQuestions = [
      { id: QUESTION_ID, order: 1, questionText: 'P1?', answerText: 'Resposta 1' },
    ]
    mockPrismaSessionFindUniqueOrThrow.mockResolvedValue({
      id: SESSION_ID,
      status: 'ACTIVE',
      questions: updatedQuestions,
    })

    const { SessionStateMachine } = await import('@/lib/briefforge/session-state-machine')
    vi.mocked(SessionStateMachine.shouldComplete).mockReturnValue(false)

    mockSelectNextStreaming.mockReturnValue(makeChunkGenerator('Qual ', 'o prazo?'))

    const validAnswer = 'Esta é uma resposta válida com bastante conteúdo'
    const res = await POST(makePostRequest({ questionId: QUESTION_ID, answer: validAnswer }), params)

    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
  })

  it('chunks chegam no formato SSE: data: {JSON}', async () => {
    const session = makeActiveSession()
    mockSessionServiceFindById.mockResolvedValue(session)

    const updatedQuestions = [
      { id: QUESTION_ID, order: 1, questionText: 'P1?', answerText: 'Resposta válida e completa' },
    ]
    mockPrismaSessionFindUniqueOrThrow.mockResolvedValue({
      id: SESSION_ID,
      status: 'ACTIVE',
      questions: updatedQuestions,
    })

    const { SessionStateMachine } = await import('@/lib/briefforge/session-state-machine')
    vi.mocked(SessionStateMachine.shouldComplete).mockReturnValue(false)

    mockSelectNextStreaming.mockReturnValue(makeChunkGenerator('Qual ', 'é o ', 'objetivo?'))

    const validAnswer = 'Esta é uma resposta válida com bastante conteúdo'
    const res = await POST(makePostRequest({ questionId: QUESTION_ID, answer: validAnswer }), params)

    const chunks = await readSSEStream(res)
    const combined = chunks.join('')

    // Deve conter os chunks no formato SSE
    expect(combined).toContain('data: {"chunk":"Qual "}')
    expect(combined).toContain('data: {"chunk":"é o "}')
    expect(combined).toContain('data: {"chunk":"objetivo?"}')
    // Deve terminar com [DONE]
    expect(combined).toContain('data: [DONE]')
  })

  it('todos os chunks concatenados formam a pergunta completa', async () => {
    const session = makeActiveSession()
    mockSessionServiceFindById.mockResolvedValue(session)

    const updatedQuestions = [
      { id: QUESTION_ID, order: 1, questionText: 'P1?', answerText: 'Resposta válida e longa' },
    ]
    mockPrismaSessionFindUniqueOrThrow.mockResolvedValue({
      id: SESSION_ID,
      status: 'ACTIVE',
      questions: updatedQuestions,
    })

    const { SessionStateMachine } = await import('@/lib/briefforge/session-state-machine')
    vi.mocked(SessionStateMachine.shouldComplete).mockReturnValue(false)

    const expectedQuestion = 'Qual é o prazo do projeto?'
    mockSelectNextStreaming.mockReturnValue(
      makeChunkGenerator('Qual ', 'é o ', 'prazo ', 'do projeto?'),
    )

    const validAnswer = 'Esta é uma resposta válida com bastante conteúdo'
    const res = await POST(makePostRequest({ questionId: QUESTION_ID, answer: validAnswer }), params)
    const chunks = await readSSEStream(res)
    const combined = chunks.join('')

    // Extrair todos os chunks de conteúdo
    const dataLines = combined
      .split('\n\n')
      .filter(line => line.startsWith('data: ') && !line.includes('[DONE]'))
      .map(line => JSON.parse(line.replace('data: ', '')).chunk as string)

    expect(dataLines.join('')).toBe(expectedQuestion)
  })

  it('shouldComplete = true → retorna JSON com sessionStatus: COMPLETED (não SSE)', async () => {
    const session = makeActiveSession(7)
    mockSessionServiceFindById.mockResolvedValue(session)
    mockSessionServiceCompleteSession.mockResolvedValue({})

    // All 7 questions answered
    const allAnswered = Array.from({ length: 7 }, (_, i) => ({
      id: `q_00${i + 1}`,
      order: i + 1,
      questionText: `P${i + 1}?`,
      answerText: `R${i + 1}`,
    }))
    mockPrismaSessionFindUniqueOrThrow.mockResolvedValue({
      id: SESSION_ID,
      status: 'ACTIVE',
      questions: allAnswered,
    })

    const { SessionStateMachine } = await import('@/lib/briefforge/session-state-machine')
    vi.mocked(SessionStateMachine.shouldComplete).mockReturnValue(true)

    const validAnswer = 'Esta é a sétima e última resposta com bastante conteúdo'
    const res = await POST(makePostRequest({ questionId: QUESTION_ID, answer: validAnswer }), params)

    // Must be JSON, not SSE
    expect(res.headers.get('Content-Type')).not.toContain('text/event-stream')
    const body = await res.json()
    expect(body.data.sessionStatus).toBe('COMPLETED')
  })

  it('AI indisponível durante stream → evento de erro SSE emitido', async () => {
    const session = makeActiveSession()
    mockSessionServiceFindById.mockResolvedValue(session)

    const updatedQuestions = [
      { id: QUESTION_ID, order: 1, questionText: 'P1?', answerText: 'Resposta válida e longa' },
    ]
    mockPrismaSessionFindUniqueOrThrow.mockResolvedValue({
      id: SESSION_ID,
      status: 'ACTIVE',
      questions: updatedQuestions,
    })

    const { SessionStateMachine } = await import('@/lib/briefforge/session-state-machine')
    vi.mocked(SessionStateMachine.shouldComplete).mockReturnValue(false)

    // Generator that throws
    async function* failingGenerator() {
      throw new AIUnavailableErrorStub()
      yield ''
    }
    mockSelectNextStreaming.mockReturnValue(failingGenerator())

    const validAnswer = 'Esta é uma resposta válida com bastante conteúdo'
    const res = await POST(makePostRequest({ questionId: QUESTION_ID, answer: validAnswer }), params)

    // Still returns SSE stream (error is communicated in-stream)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')

    const chunks = await readSSEStream(res)
    const combined = chunks.join('')
    expect(combined).toContain('"degraded":true')
    // Placeholder question should be deleted
    expect(mockPrismaQuestionDelete).toHaveBeenCalled()
  })

  it('pergunta persiste questionText completo no DB após stream', async () => {
    const session = makeActiveSession()
    mockSessionServiceFindById.mockResolvedValue(session)

    const updatedQuestions = [
      { id: QUESTION_ID, order: 1, questionText: 'P1?', answerText: 'Resposta persistida' },
    ]
    mockPrismaSessionFindUniqueOrThrow.mockResolvedValue({
      id: SESSION_ID,
      status: 'ACTIVE',
      questions: updatedQuestions,
    })

    const { SessionStateMachine } = await import('@/lib/briefforge/session-state-machine')
    vi.mocked(SessionStateMachine.shouldComplete).mockReturnValue(false)

    mockSelectNextStreaming.mockReturnValue(makeChunkGenerator('Qual ', 'o budget?'))

    const validAnswer = 'Esta é uma resposta válida com bastante conteúdo'
    const res = await POST(makePostRequest({ questionId: QUESTION_ID, answer: validAnswer }), params)

    // Consume stream to trigger DB update
    await readSSEStream(res)

    // Verify questionText was persisted after stream completes
    expect(mockPrismaQuestionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ questionText: 'Qual o budget?' }),
      }),
    )
  })
})
