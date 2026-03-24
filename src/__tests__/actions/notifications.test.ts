import { vi, describe, it, expect, beforeEach } from 'vitest'

// RESOLVED: G007 — Testes de contrato para Server Actions de notifications
// Cobre os mesmos cenários BDD que GET/PUT /api/notifications/preferences cobririam

// ─── MOCK NEXT CACHE ──────────────────────────────────────────────────────────

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ─── MOCK AUTH ────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/get-user', () => ({
  requireServerUser: vi.fn(),
}))

import { requireServerUser } from '@/lib/auth/get-user'

const mockGetAuthUser = vi.mocked(requireServerUser)

// ─── MOCK PRISMA ──────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    notificationPreference: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

const mockNotifFindMany = vi.mocked(prisma.notification.findMany)
const mockNotifCount = vi.mocked(prisma.notification.count)
const mockNotifUpdate = vi.mocked(prisma.notification.update)
const mockNotifUpdateMany = vi.mocked(prisma.notification.updateMany)
const mockPrefFindMany = vi.mocked(prisma.notificationPreference.findMany)
const mockPrefUpsert = vi.mocked(prisma.notificationPreference.upsert)

// ─── IMPORT ACTIONS ───────────────────────────────────────────────────────────

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreference,
} from '@/actions/notifications'

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

const USER_ID = '660e8400-e29b-41d4-a716-446655440001'

const fakeUser = {
  id: USER_ID,
  name: 'Test User',
  email: 'test@test.com',
  role: 'DEV',
  organizationId: 'org-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  avatarUrl: null,
}

const fakeNotification = {
  id: 'notif-001',
  userId: USER_ID,
  projectId: 'proj-001',
  type: 'TASK_ASSIGNED',
  title: 'Nova tarefa atribuída',
  body: 'Você foi atribuído à tarefa X',
  isRead: false,
  readAt: null,
  link: '/projetos/proj-001/board',
  createdAt: new Date(),
}

const fakePreference = {
  id: 'pref-001',
  userId: USER_ID,
  eventType: 'TASK_ASSIGNED',
  channel: 'IN_APP',
  enabled: true,
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('getNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeUser as never)
    mockNotifFindMany.mockResolvedValue([fakeNotification] as never)
    mockNotifCount
      .mockResolvedValueOnce(1 as never) // total
      .mockResolvedValueOnce(1 as never) // unreadCount
  })

  it('[SUCCESS] retorna lista paginada de notificações', async () => {
    const result = await getNotifications()

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('total', 1)
    expect(result).toHaveProperty('unreadCount', 1)
    expect(result).toHaveProperty('page', 1)
  })

  it('[SUCCESS] filtra apenas não-lidas quando unreadOnly=true', async () => {
    await getNotifications({ unreadOnly: true })

    expect(mockNotifFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isRead: false }),
      }),
    )
  })

  it('[SUCCESS] aceita paginação customizada', async () => {
    await getNotifications({ page: 2, limit: 5 })

    expect(mockNotifFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      }),
    )
  })

  it('[ERROR] retorna erro quando getAuthUser falha', async () => {
    mockGetAuthUser.mockRejectedValue(new Error('Unauthorized'))

    const result = await getNotifications()

    expect(result).toHaveProperty('error')
  })

  it('[DEGRADED] retorna lista vazia quando sem notificações', async () => {
    mockNotifFindMany.mockResolvedValue([] as never)
    mockNotifCount
      .mockReset()
      .mockResolvedValueOnce(0 as never)
      .mockResolvedValueOnce(0 as never)

    const result = await getNotifications()

    expect(result).toHaveProperty('data')
    expect((result as { data: unknown[] }).data).toHaveLength(0)
    expect(result).toHaveProperty('total', 0)
  })
})

describe('markNotificationRead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeUser as never)
    mockNotifUpdate.mockResolvedValue({ ...fakeNotification, isRead: true, readAt: new Date() } as never)
  })

  it('[SUCCESS] marca notificação como lida', async () => {
    const result = await markNotificationRead('notif-001')

    expect(result).toHaveProperty('data')
    expect(mockNotifUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notif-001', userId: USER_ID },
        data: expect.objectContaining({ isRead: true }),
      }),
    )
  })

  it('[ERROR] retorna erro para notificação inexistente ou de outro usuário', async () => {
    mockNotifUpdate.mockRejectedValue(new Error('Record not found'))

    const result = await markNotificationRead('notif-999')

    expect(result).toHaveProperty('error')
  })

  it('[ERROR] retorna erro quando não autenticado', async () => {
    mockGetAuthUser.mockRejectedValue(new Error('Unauthorized'))

    const result = await markNotificationRead('notif-001')

    expect(result).toHaveProperty('error')
  })
})

describe('markAllNotificationsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeUser as never)
    mockNotifUpdateMany.mockResolvedValue({ count: 3 } as never)
  })

  it('[SUCCESS] marca todas como lidas', async () => {
    const result = await markAllNotificationsRead()

    expect(result).toHaveProperty('success', true)
    expect(mockNotifUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, isRead: false },
      }),
    )
  })

  it('[DEGRADED] funciona mesmo sem notificações não-lidas', async () => {
    mockNotifUpdateMany.mockResolvedValue({ count: 0 } as never)

    const result = await markAllNotificationsRead()

    expect(result).toHaveProperty('success', true)
  })
})

describe('getNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeUser as never)
    mockPrefFindMany.mockResolvedValue([fakePreference] as never)
  })

  it('[SUCCESS] retorna preferências do usuário', async () => {
    const result = await getNotificationPreferences()

    expect(result).toHaveProperty('data')
    expect(mockPrefFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID },
      }),
    )
  })

  it('[ERROR] retorna erro quando não autenticado', async () => {
    mockGetAuthUser.mockRejectedValue(new Error('Unauthorized'))

    const result = await getNotificationPreferences()

    expect(result).toHaveProperty('error')
  })

  it('[DEGRADED] retorna lista vazia para usuário sem preferências', async () => {
    mockPrefFindMany.mockResolvedValue([] as never)

    const result = await getNotificationPreferences()

    expect(result).toHaveProperty('data')
    expect((result as { data: unknown[] }).data).toHaveLength(0)
  })
})

describe('updateNotificationPreference', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeUser as never)
    mockPrefUpsert.mockResolvedValue(fakePreference as never)
  })

  it('[SUCCESS] cria ou atualiza preferência', async () => {
    const result = await updateNotificationPreference({
      eventType: 'TASK_ASSIGNED',
      channel: 'IN_APP',
      enabled: true,
    })

    expect(result).toHaveProperty('data')
    expect(mockPrefUpsert).toHaveBeenCalledTimes(1)
  })

  it('[SUCCESS] desabilita preferência', async () => {
    mockPrefUpsert.mockResolvedValue({ ...fakePreference, enabled: false } as never)

    const result = await updateNotificationPreference({
      eventType: 'TASK_ASSIGNED',
      channel: 'IN_APP',
      enabled: false,
    })

    expect(result).toHaveProperty('data')
  })

  it('[ERROR] retorna erro com eventType inválido (Zod)', async () => {
    const result = await updateNotificationPreference({
      eventType: '',
      channel: 'IN_APP',
      enabled: true,
    })

    expect(result).toHaveProperty('error')
  })

  it('[EDGE] upsert cria nova preferência quando não existe', async () => {
    const result = await updateNotificationPreference({
      eventType: 'SCOPE_ALERT',
      channel: 'EMAIL',
      enabled: true,
    })

    expect(result).toHaveProperty('data')
    expect(mockPrefUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId_eventType_channel: expect.objectContaining({
            userId: USER_ID,
            eventType: 'SCOPE_ALERT',
            channel: 'EMAIL',
          }),
        }),
      }),
    )
  })
})
