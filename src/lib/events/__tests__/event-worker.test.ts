import { vi, describe, it, expect, beforeEach } from 'vitest'
import { EventWorker } from '../worker'
import type { Event } from '@prisma/client'

// ─── MOCK DO PRISMA ───────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

const mockFindMany = vi.mocked(prisma.event.findMany)
const mockUpdate = vi.mocked(prisma.event.update)

// ─── MOCK DOS HANDLERS ──────────────────────────────────────────────────────

vi.mock('../handlers', () => ({
  getHandlersForType: vi.fn(),
}))

import { getHandlersForType } from '../handlers'

const mockGetHandlers = vi.mocked(getHandlersForType)

// ─── HELPERS ────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    type: 'PROJECT_CREATED',
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    payload: {},
    sourceModule: 'event-bus',
    processedAt: null,
    correlationId: null,
    createdAt: new Date('2026-03-22T10:00:00Z'),
    ...overrides,
  } as Event
}

// ─── TESTES: processNext ────────────────────────────────────────────────────

describe('EventWorker.processNext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue({} as never)
  })

  it('busca eventos onde processedAt e null, ordenados por createdAt asc', async () => {
    mockFindMany.mockResolvedValue([])

    await EventWorker.processNext(5)

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { processedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 5,
    })
  })

  it('respeita parametro batchSize', async () => {
    mockFindMany.mockResolvedValue([])

    await EventWorker.processNext(3)

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    )
  })

  it('retorna 0 para batchSize <= 0', async () => {
    const result = await EventWorker.processNext(0)

    expect(result).toBe(0)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('retorna 0 para batchSize negativo', async () => {
    const result = await EventWorker.processNext(-1)

    expect(result).toBe(0)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('processa eventos e retorna contagem de sucessos', async () => {
    const events = [makeEvent({ id: 'evt-1' }), makeEvent({ id: 'evt-2' })]
    mockFindMany.mockResolvedValue(events as never)
    mockGetHandlers.mockReturnValue([vi.fn().mockResolvedValue(undefined)])

    const result = await EventWorker.processNext(10)

    expect(result).toBe(2)
  })

  it('conta apenas eventos processados com sucesso', async () => {
    const events = [makeEvent({ id: 'evt-1' }), makeEvent({ id: 'evt-2' })]
    mockFindMany.mockResolvedValue(events as never)

    const successHandler = vi.fn().mockResolvedValue(undefined)
    const failHandler = vi.fn().mockRejectedValue(new Error('handler error'))

    mockGetHandlers
      .mockReturnValueOnce([successHandler])
      .mockReturnValueOnce([failHandler])

    const result = await EventWorker.processNext(10)

    expect(result).toBe(1)
  })
})

// ─── TESTES: processOne ─────────────────────────────────────────────────────

describe('EventWorker.processOne', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue({} as never)
  })

  it('executa todos os handlers para o tipo do evento', async () => {
    const handler1 = vi.fn().mockResolvedValue(undefined)
    const handler2 = vi.fn().mockResolvedValue(undefined)
    mockGetHandlers.mockReturnValue([handler1, handler2])

    const event = makeEvent()
    await EventWorker.processOne(event)

    expect(handler1).toHaveBeenCalledWith(event)
    expect(handler2).toHaveBeenCalledWith(event)
  })

  it('marca evento como processado (sets processedAt) em caso de sucesso', async () => {
    mockGetHandlers.mockReturnValue([vi.fn().mockResolvedValue(undefined)])

    const event = makeEvent({ id: 'evt-success' })
    const result = await EventWorker.processOne(event)

    expect(result).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'evt-success' },
      data: { processedAt: expect.any(Date) },
    })
  })

  it('incrementa retry count em caso de erro', async () => {
    mockGetHandlers.mockReturnValue([
      vi.fn().mockRejectedValue(new Error('handler failed')),
    ])

    const event = makeEvent({ id: 'evt-retry', correlationId: null })
    await EventWorker.processOne(event)

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'evt-retry' },
      data: {
        correlationId: expect.stringContaining('"count":1'),
      },
    })
  })

  it('marca evento como FAILED apos 3 retries', async () => {
    mockGetHandlers.mockReturnValue([
      vi.fn().mockRejectedValue(new Error('persistent error')),
    ])

    // correlationId com count=2 → proximo erro sera count=3 → FAILED
    const event = makeEvent({
      id: 'evt-fail',
      correlationId: JSON.stringify({ count: 2 }),
    })

    const result = await EventWorker.processOne(event)

    expect(result).toBe(false)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'evt-fail' },
      data: {
        processedAt: expect.any(Date),
        correlationId: expect.stringContaining('"status":"FAILED"'),
      },
    })
  })

  it('retorna true em caso de sucesso', async () => {
    mockGetHandlers.mockReturnValue([vi.fn().mockResolvedValue(undefined)])

    const result = await EventWorker.processOne(makeEvent())

    expect(result).toBe(true)
  })

  it('retorna false em caso de erro', async () => {
    mockGetHandlers.mockReturnValue([
      vi.fn().mockRejectedValue(new Error('fail')),
    ])

    const result = await EventWorker.processOne(makeEvent())

    expect(result).toBe(false)
  })

  it('processa evento sem handlers (array vazio) com sucesso', async () => {
    mockGetHandlers.mockReturnValue([])

    const result = await EventWorker.processOne(makeEvent())

    expect(result).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: { processedAt: expect.any(Date) },
    })
  })
})

// ─── TESTES: parseRetryState (via processOne) ───────────────────────────────

describe('EventWorker retry state parsing (via processOne)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue({} as never)
    mockGetHandlers.mockReturnValue([
      vi.fn().mockRejectedValue(new Error('test error')),
    ])
  })

  it('trata correlationId null como count 0 (primeiro retry sera count 1)', async () => {
    const event = makeEvent({ correlationId: null })
    await EventWorker.processOne(event)

    const updateCall = mockUpdate.mock.calls[0][0]
    const savedState = JSON.parse(updateCall.data.correlationId as string)
    expect(savedState.count).toBe(1)
  })

  it('parseia JSON valido do correlationId', async () => {
    const event = makeEvent({
      correlationId: JSON.stringify({ count: 1, lastError: 'previous' }),
    })
    await EventWorker.processOne(event)

    const updateCall = mockUpdate.mock.calls[0][0]
    const savedState = JSON.parse(updateCall.data.correlationId as string)
    expect(savedState.count).toBe(2)
  })

  it('trata JSON invalido como count 0', async () => {
    const event = makeEvent({ correlationId: 'not-json' })
    await EventWorker.processOne(event)

    const updateCall = mockUpdate.mock.calls[0][0]
    const savedState = JSON.parse(updateCall.data.correlationId as string)
    expect(savedState.count).toBe(1)
  })
})
