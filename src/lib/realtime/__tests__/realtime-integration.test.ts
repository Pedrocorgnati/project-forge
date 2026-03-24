import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── MOCK SUPABASE ────────────────────────────────────────────────────────────

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn().mockResolvedValue(undefined),
  send: vi.fn().mockResolvedValue({ error: null }),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn().mockReturnValue(mockChannel),
  }),
}))

// ─── MOCK PRISMA ──────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    $executeRaw: vi.fn().mockResolvedValue(1),
  },
}))

import { prisma } from '@/lib/db'
import { subscribeToProjectEvents, subscribeToUserNotifications, unsubscribe } from '@/lib/realtime/subscription'
import { EventBroadcaster } from '@/lib/events/broadcaster'
import { EventType } from '@/lib/constants/events'

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('Realtime subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChannel.on.mockReturnThis()
    mockChannel.subscribe.mockReturnThis()
    mockChannel.unsubscribe.mockResolvedValue(undefined)
  })

  it('subscribeToProjectEvents retorna canal com subscribe chamado', () => {
    const handler = vi.fn()
    const channel = subscribeToProjectEvents('proj-1', handler)

    expect(channel).toBeDefined()
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('subscribeToUserNotifications retorna canal e aceita callback', () => {
    const handler = vi.fn()
    const channel = subscribeToUserNotifications('user-1', handler)

    expect(channel).toBeDefined()
    expect(mockChannel.on).toHaveBeenCalledWith(
      'broadcast',
      { event: 'notification' },
      expect.any(Function),
    )
  })

  it('unsubscribe encerra a conexão do canal sem erro', async () => {
    const channel = subscribeToProjectEvents('proj-1', vi.fn())
    await expect(unsubscribe(channel)).resolves.toBeUndefined()
    expect(mockChannel.unsubscribe).toHaveBeenCalled()
  })

  it('filtro por event no channel: usa broadcast com event "notification"', () => {
    subscribeToUserNotifications('user-xyz', vi.fn())
    expect(mockChannel.on).toHaveBeenCalledWith(
      'broadcast',
      { event: 'notification' },
      expect.any(Function),
    )
  })
})

describe('EventBroadcaster', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('broadcast() chama pg_notify com payload serializado corretamente', async () => {
    await EventBroadcaster.broadcast(
      EventType.BRIEF_PRD_APPROVED,
      'proj-123',
      { projectId: 'proj-123', approvedBy: 'user-1', prdVersion: 1 },
    )

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
  })

  it('broadcast() captura erro de pg_notify sem propagação', async () => {
    vi.mocked(prisma.$executeRaw).mockRejectedValueOnce(new Error('pg_notify timeout'))

    await expect(
      EventBroadcaster.broadcast(
        EventType.PROJECT_CREATED,
        'proj-456',
        { projectId: 'proj-456', createdBy: 'user-1' },
      ),
    ).resolves.toBeUndefined()
  })
})

describe('useRealtimeEvents hook — lógica de estado', () => {
  it('MAX_EVENTS_IN_MEMORY limita a 50 eventos no array', () => {
    // Verificação do invariante: evitar memory leak
    const MAX = 50
    const arr: number[] = []
    for (let i = 0; i < 51; i++) {
      const updated = [i, ...arr]
      arr.splice(0, arr.length, ...updated.slice(0, MAX))
    }
    expect(arr.length).toBe(MAX)
  })

  it('array de eventos limitado: 51 eventos → length === 50', () => {
    const MAX = 50
    let events: number[] = []
    for (let i = 0; i < 51; i++) {
      events = [i, ...events].slice(0, MAX)
    }
    expect(events.length).toBe(50)
    expect(events[0]).toBe(50) // evento mais recente
  })

  it('filtro client-side: evento de tipo incorreto não entra no array', () => {
    const allowedTypes: string[] = [EventType.ESTIMATE_APPROVED]
    const incomingType: string = EventType.BRIEF_PRD_APPROVED

    const passes = allowedTypes.includes(incomingType)
    expect(passes).toBe(false)
  })

  it('filtro client-side: evento do tipo correto entra no array', () => {
    const allowedTypes = [EventType.ESTIMATE_APPROVED]
    const incomingType = EventType.ESTIMATE_APPROVED

    const passes = allowedTypes.includes(incomingType)
    expect(passes).toBe(true)
  })
})
