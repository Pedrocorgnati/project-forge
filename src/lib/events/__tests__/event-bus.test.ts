import { vi, describe, it, expect, beforeEach } from 'vitest'
import { EventBus } from '../bus'
import { EventType } from '@/lib/constants/events'

// ─── MOCK DO PRISMA ───────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    event: {
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

const mockCreate = vi.mocked(prisma.event.create)

// ─── MOCK DO VALIDATOR ──────────────────────────────────────────────────────

vi.mock('@/lib/utils/validate', () => ({
  isValidUuid: vi.fn(),
}))

import { isValidUuid } from '@/lib/utils/validate'

const mockIsValidUuid = vi.mocked(isValidUuid)

// ─── MOCK DO BROADCASTER ───────────────────────────────────────────────────

vi.mock('../broadcaster', () => ({
  EventBroadcaster: {
    broadcast: vi.fn(),
  },
}))

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('EventBus.publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsValidUuid.mockReturnValue(true)
    mockCreate.mockResolvedValue({
      id: 'evt-123',
      type: 'PROJECT_CREATED',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      payload: {},
      sourceModule: 'event-bus',
      processedAt: null,
      correlationId: null,
      createdAt: new Date(),
    } as never)
  })

  it('cria evento via prisma.event.create com type, projectId e payload corretos', async () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000'
    const payload = { projectName: 'Test Project' }

    await EventBus.publish(
      EventType.PROJECT_CREATED,
      projectId,
      payload as never,
    )

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: EventType.PROJECT_CREATED,
        projectId,
        payload,
        sourceModule: 'event-bus',
        processedAt: null,
      }),
    })
  })

  it('usa sourceModule customizado quando fornecido', async () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000'

    await EventBus.publish(
      EventType.PROJECT_CREATED,
      projectId,
      {} as never,
      'module-brief',
    )

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceModule: 'module-brief',
      }),
    })
  })

  it('rejeita projectId invalido (nao-UUID)', async () => {
    mockIsValidUuid.mockReturnValue(false)

    await expect(
      EventBus.publish(EventType.PROJECT_CREATED, 'not-a-uuid', {} as never),
    ).rejects.toThrow('VAL_001')

    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('chama EventBroadcaster.broadcast apos criar evento', async () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000'
    const payload = { projectName: 'Test' }

    await EventBus.publish(
      EventType.PROJECT_CREATED,
      projectId,
      payload as never,
    )

    const { EventBroadcaster } = await import('../broadcaster')
    expect(EventBroadcaster.broadcast).toHaveBeenCalledWith(
      EventType.PROJECT_CREATED,
      projectId,
      payload,
    )
  })

  it('nao propaga erro do broadcaster (best-effort)', async () => {
    const { EventBroadcaster } = await import('../broadcaster')
    vi.mocked(EventBroadcaster.broadcast).mockRejectedValueOnce(
      new Error('pg_notify failed'),
    )

    const projectId = '550e8400-e29b-41d4-a716-446655440000'

    // Nao deve lançar erro
    await expect(
      EventBus.publish(EventType.PROJECT_CREATED, projectId, {} as never),
    ).resolves.toBeUndefined()

    // Mas o evento foi criado no banco
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('valida projectId usando isValidUuid', async () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000'

    await EventBus.publish(EventType.PROJECT_CREATED, projectId, {} as never)

    expect(mockIsValidUuid).toHaveBeenCalledWith(projectId)
  })
})
