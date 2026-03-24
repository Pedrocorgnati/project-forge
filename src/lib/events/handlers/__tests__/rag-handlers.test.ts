import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Event } from '@prisma/client'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRAGIndexFindUnique = vi.fn()
const mockBriefFindFirst = vi.fn()
const mockEstimateFindMany = vi.fn()
const mockRAGDocumentCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    rAGIndex: {
      findUnique: (...args: unknown[]) => mockRAGIndexFindUnique(...args),
    },
    brief: {
      findFirst: (...args: unknown[]) => mockBriefFindFirst(...args),
    },
    estimate: {
      findMany: (...args: unknown[]) => mockEstimateFindMany(...args),
    },
    rAGDocument: {
      create: (...args: unknown[]) => mockRAGDocumentCreate(...args),
    },
  },
}))

// Import registerRAGHandlers and capture the registered handler
let capturedHandler: ((event: Event) => Promise<void>) | null = null

const { registerRAGHandlers } = await import('../rag-handlers')

// Register and capture the RAG_INDEX_STARTED handler
registerRAGHandlers((type: string, handler: (event: Event) => Promise<void>) => {
  if (type === 'RAG_INDEX_STARTED') {
    capturedHandler = handler
  }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PROJECT_ID = '123e4567-e89b-12d3-a456-426614174003'
const RAG_INDEX_ID = 'rag-idx-004'

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-001',
    type: 'RAG_INDEX_STARTED',
    projectId: PROJECT_ID,
    payload: { projectId: PROJECT_ID, repoUrl: '' },
    sourceModule: 'module-12',
    processedAt: null,
    createdAt: new Date('2026-03-22T10:00:00Z'),
    ...overrides,
  } as Event
}

function makeRAGIndex() {
  return {
    id: RAG_INDEX_ID,
    projectId: PROJECT_ID,
    indexationStatus: 'IN_PROGRESS',
  }
}

function makeBriefWithContent() {
  return {
    id: 'brief-001',
    projectId: PROJECT_ID,
    status: 'COMPLETED',
    sessions: [
      {
        id: 'session-001',
        questions: [
          { id: 'q-1', questionText: 'What is the project goal?', answerText: 'Build a SaaS platform.' },
          { id: 'q-2', questionText: 'Who are the users?', answerText: 'Freelance developers.' },
        ],
      },
    ],
  }
}

function makeEstimate(version = 1) {
  return {
    id: `estimate-${version}`,
    projectId: PROJECT_ID,
    version,
    status: 'APPROVED',
    confidence: 'HIGH',
    totalMin: 40,
    totalMax: 60,
    items: [
      { id: 'item-1', category: 'Frontend', description: 'Build UI components', hoursMin: 20, hoursMax: 30 },
      { id: 'item-2', category: 'Backend', description: 'Build API', hoursMin: 20, hoursMax: 30 },
    ],
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('registerRAGHandlers', () => {
  it('registers RAG_INDEX_STARTED handler', () => {
    expect(capturedHandler).not.toBeNull()
  })
})

describe('handleRAGIndexStarted', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates RAGDocument for Brief COMPLETED with sourceType "docs"', async () => {
    mockRAGIndexFindUnique.mockResolvedValue(makeRAGIndex())
    mockBriefFindFirst.mockResolvedValue(makeBriefWithContent())
    mockEstimateFindMany.mockResolvedValue([])
    mockRAGDocumentCreate.mockResolvedValue({ id: 'rag-doc-001' })

    await capturedHandler!(makeEvent())

    expect(mockRAGDocumentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ragIndexId: RAG_INDEX_ID,
          sourceType: 'docs',
          sourcePath: 'brief/project-brief',
        }),
      }),
    )
  })

  it('brief content includes Q&A from all sessions', async () => {
    mockRAGIndexFindUnique.mockResolvedValue(makeRAGIndex())
    mockBriefFindFirst.mockResolvedValue(makeBriefWithContent())
    mockEstimateFindMany.mockResolvedValue([])
    mockRAGDocumentCreate.mockResolvedValue({ id: 'rag-doc-001' })

    await capturedHandler!(makeEvent())

    const createCall = mockRAGDocumentCreate.mock.calls[0][0]
    expect(createCall.data.content).toContain('What is the project goal?')
    expect(createCall.data.content).toContain('Build a SaaS platform.')
    expect(createCall.data.content).toContain('Who are the users?')
    expect(createCall.data.content).toContain('Freelance developers.')
  })

  it('creates RAGDocuments for Estimates APPROVED', async () => {
    mockRAGIndexFindUnique.mockResolvedValue(makeRAGIndex())
    mockBriefFindFirst.mockResolvedValue(null)
    mockEstimateFindMany.mockResolvedValue([makeEstimate(1), makeEstimate(2)])
    mockRAGDocumentCreate.mockResolvedValue({ id: 'rag-doc-001' })

    await capturedHandler!(makeEvent())

    expect(mockRAGDocumentCreate).toHaveBeenCalledTimes(2)
    expect(mockRAGDocumentCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: 'docs',
          sourcePath: 'estimates/v1',
          ragIndexId: RAG_INDEX_ID,
        }),
      }),
    )
    expect(mockRAGDocumentCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          sourcePath: 'estimates/v2',
        }),
      }),
    )
  })

  it('estimate content includes version, confidence, totals and items', async () => {
    mockRAGIndexFindUnique.mockResolvedValue(makeRAGIndex())
    mockBriefFindFirst.mockResolvedValue(null)
    mockEstimateFindMany.mockResolvedValue([makeEstimate(1)])
    mockRAGDocumentCreate.mockResolvedValue({ id: 'rag-doc-001' })

    await capturedHandler!(makeEvent())

    const createCall = mockRAGDocumentCreate.mock.calls[0][0]
    const content: string = createCall.data.content
    expect(content).toContain('Estimate v1')
    expect(content).toContain('HIGH confidence')
    expect(content).toContain('40h–60h')
    expect(content).toContain('Frontend')
    expect(content).toContain('Backend')
  })

  it('creates no documents when no Brief and no Estimates exist', async () => {
    mockRAGIndexFindUnique.mockResolvedValue(makeRAGIndex())
    mockBriefFindFirst.mockResolvedValue(null)
    mockEstimateFindMany.mockResolvedValue([])

    await capturedHandler!(makeEvent())

    expect(mockRAGDocumentCreate).not.toHaveBeenCalled()
  })

  it('returns without error when RAGIndex does not exist', async () => {
    mockRAGIndexFindUnique.mockResolvedValue(null)

    await expect(capturedHandler!(makeEvent())).resolves.toBeUndefined()

    expect(mockBriefFindFirst).not.toHaveBeenCalled()
    expect(mockEstimateFindMany).not.toHaveBeenCalled()
    expect(mockRAGDocumentCreate).not.toHaveBeenCalled()
  })

  it('returns without error when projectId is null (event without project)', async () => {
    await expect(
      capturedHandler!(makeEvent({ projectId: null })),
    ).resolves.toBeUndefined()

    expect(mockRAGIndexFindUnique).not.toHaveBeenCalled()
  })

  it('does not propagate exceptions (EventBus safety)', async () => {
    mockRAGIndexFindUnique.mockRejectedValue(new Error('DB connection lost'))

    // Handler must NOT throw — EventBus safety
    await expect(capturedHandler!(makeEvent())).resolves.toBeUndefined()
  })

  it('does not create Brief document when Brief has no answered questions', async () => {
    mockRAGIndexFindUnique.mockResolvedValue(makeRAGIndex())
    mockBriefFindFirst.mockResolvedValue({
      id: 'brief-empty',
      projectId: PROJECT_ID,
      status: 'COMPLETED',
      sessions: [
        {
          id: 'session-001',
          questions: [
            { id: 'q-1', questionText: 'What?', answerText: null },
            { id: 'q-2', questionText: 'Why?', answerText: null },
          ],
        },
      ],
    })
    mockEstimateFindMany.mockResolvedValue([])

    await capturedHandler!(makeEvent())

    // No document created because briefContent.length === 0
    expect(mockRAGDocumentCreate).not.toHaveBeenCalled()
  })

  it('creates both Brief and Estimate documents when both exist', async () => {
    mockRAGIndexFindUnique.mockResolvedValue(makeRAGIndex())
    mockBriefFindFirst.mockResolvedValue(makeBriefWithContent())
    mockEstimateFindMany.mockResolvedValue([makeEstimate(1)])
    mockRAGDocumentCreate.mockResolvedValue({ id: 'rag-doc-001' })

    await capturedHandler!(makeEvent())

    // 1 brief + 1 estimate = 2 creates
    expect(mockRAGDocumentCreate).toHaveBeenCalledTimes(2)
  })

  it('queries brief with COMPLETED status for the correct project', async () => {
    mockRAGIndexFindUnique.mockResolvedValue(makeRAGIndex())
    mockBriefFindFirst.mockResolvedValue(null)
    mockEstimateFindMany.mockResolvedValue([])

    await capturedHandler!(makeEvent())

    expect(mockBriefFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: PROJECT_ID, status: 'COMPLETED' },
      }),
    )
  })

  it('queries estimates with APPROVED status for the correct project', async () => {
    mockRAGIndexFindUnique.mockResolvedValue(makeRAGIndex())
    mockBriefFindFirst.mockResolvedValue(null)
    mockEstimateFindMany.mockResolvedValue([])

    await capturedHandler!(makeEvent())

    expect(mockEstimateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: PROJECT_ID, status: 'APPROVED' },
      }),
    )
  })
})
