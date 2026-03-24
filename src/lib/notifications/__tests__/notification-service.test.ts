import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NotificationService } from '../service'
import { NotificationChannel, NotificationPriority } from '@prisma/client'

// ─── MOCK DO PRISMA ───────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    notificationPreference: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

const mockPrefFindUnique = vi.mocked(prisma.notificationPreference.findUnique)
const mockNotifCreate = vi.mocked(prisma.notification.create)
const mockNotifCount = vi.mocked(prisma.notification.count)
const mockUserFindUnique = vi.mocked(prisma.user.findUnique)

// ─── MOCK DO ANTI-FATIGUE ───────────────────────────────────────────────────

vi.mock('../anti-fatigue', () => ({
  checkAntiFatigue: vi.fn(),
  isQuietHoursNow: vi.fn(),
}))

import { checkAntiFatigue, isQuietHoursNow } from '../anti-fatigue'

const mockCheckAntiFatigue = vi.mocked(checkAntiFatigue)
const mockIsQuietHoursNow = vi.mocked(isQuietHoursNow)

// ─── MOCK DOS CHANNELS ─────────────────────────────────────────────────────

vi.mock('../channels/in-app', () => ({
  InAppChannel: {
    send: vi.fn(),
  },
}))

vi.mock('../channels/email', () => ({
  EmailChannel: {
    send: vi.fn(),
  },
}))

import { InAppChannel } from '../channels/in-app'
import { EmailChannel } from '../channels/email'

const mockInAppSend = vi.mocked(InAppChannel.send)
const mockEmailSend = vi.mocked(EmailChannel.send)

// ─── HELPERS ────────────────────────────────────────────────────────────────

const defaultParams = {
  userId: 'user-1',
  type: 'PROJECT_CREATED',
  title: 'Projeto criado',
  body: 'O projeto Test foi criado com sucesso.',
}

function setupDefaultMocks() {
  mockIsQuietHoursNow.mockReturnValue(false)
  mockCheckAntiFatigue.mockResolvedValue(true)
  // No preferences found → defaults apply (in-app on, email off)
  mockPrefFindUnique.mockResolvedValue(null)
  mockNotifCreate.mockResolvedValue({
    id: 'notif-1',
    userId: 'user-1',
    type: 'PROJECT_CREATED',
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.LOW,
    payload: {},
    projectId: null,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never)
}

// ─── TESTES: send() — validacoes ────────────────────────────────────────────

describe('NotificationService.send — validacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('lanca erro se userId e vazio', async () => {
    await expect(
      NotificationService.send({ ...defaultParams, userId: '' }),
    ).rejects.toThrow('NOTIF_VAL_001')
  })

  it('lanca erro se title e vazio', async () => {
    await expect(
      NotificationService.send({ ...defaultParams, title: '' }),
    ).rejects.toThrow('NOTIF_VAL_001')
  })

  it('lanca erro se body e vazio', async () => {
    await expect(
      NotificationService.send({ ...defaultParams, body: '' }),
    ).rejects.toThrow('NOTIF_VAL_001')
  })
})

// ─── TESTES: send() — quiet hours e anti-fatigue ────────────────────────────

describe('NotificationService.send — quiet hours e anti-fatigue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('retorna silenciosamente durante quiet hours', async () => {
    mockIsQuietHoursNow.mockReturnValue(true)

    await NotificationService.send(defaultParams)

    expect(mockCheckAntiFatigue).not.toHaveBeenCalled()
    expect(mockNotifCreate).not.toHaveBeenCalled()
  })

  it('retorna silenciosamente se anti-fatigue bloqueia', async () => {
    mockCheckAntiFatigue.mockResolvedValue(false)

    await NotificationService.send(defaultParams)

    expect(mockNotifCreate).not.toHaveBeenCalled()
  })
})

// ─── TESTES: send() — canal in-app ─────────────────────────────────────────

describe('NotificationService.send — canal in-app', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('cria notificacao IN_APP quando nenhuma preferencia desabilita', async () => {
    await NotificationService.send(defaultParams)

    expect(mockNotifCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: 'PROJECT_CREATED',
        channel: NotificationChannel.IN_APP,
        isRead: false,
      }),
    })
  })

  it('NAO cria notificacao IN_APP quando preferencia desabilita', async () => {
    // Primeira chamada = IN_APP pref (disabled), segunda = EMAIL pref
    mockPrefFindUnique
      .mockResolvedValueOnce({ enabled: false } as never) // IN_APP disabled
      .mockResolvedValueOnce(null) // EMAIL not set

    await NotificationService.send(defaultParams)

    expect(mockNotifCreate).not.toHaveBeenCalled()
  })

  it('chama InAppChannel.send para notificacao in-app', async () => {
    await NotificationService.send(defaultParams)

    expect(mockInAppSend).toHaveBeenCalledTimes(1)
    expect(mockInAppSend).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'notif-1' }),
    )
  })
})

// ─── TESTES: send() — canal email ───────────────────────────────────────────

describe('NotificationService.send — canal email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('NAO envia email por default (preferencia nao configurada)', async () => {
    await NotificationService.send(defaultParams)

    expect(mockEmailSend).not.toHaveBeenCalled()
  })

  it('envia email quando preferencia EMAIL esta habilitada', async () => {
    mockPrefFindUnique
      .mockResolvedValueOnce(null) // IN_APP → default enabled
      .mockResolvedValueOnce({ enabled: true } as never) // EMAIL → enabled

    mockUserFindUnique.mockResolvedValue({
      email: 'user@example.com',
    } as never)

    // Segundo create para email notification
    mockNotifCreate
      .mockResolvedValueOnce({ id: 'notif-inapp' } as never) // in-app
      .mockResolvedValueOnce({ id: 'notif-email' } as never) // email

    await NotificationService.send(defaultParams)

    expect(mockEmailSend).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({ id: 'notif-email' }),
    )
  })

  it('cria notificacao EMAIL com isRead true', async () => {
    mockPrefFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ enabled: true } as never)

    mockUserFindUnique.mockResolvedValue({
      email: 'user@example.com',
    } as never)

    mockNotifCreate.mockResolvedValue({ id: 'notif-email' } as never)

    await NotificationService.send(defaultParams)

    // Segundo create (email) deve ter isRead: true
    const emailCreateCall = mockNotifCreate.mock.calls[1]
    expect(emailCreateCall[0].data).toEqual(
      expect.objectContaining({
        channel: NotificationChannel.EMAIL,
        isRead: true,
      }),
    )
  })

  it('nao envia email se usuario nao tem email cadastrado', async () => {
    mockPrefFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ enabled: true } as never)

    mockUserFindUnique.mockResolvedValue({ email: null } as never)

    mockNotifCreate.mockResolvedValue({ id: 'notif-inapp' } as never)

    await NotificationService.send(defaultParams)

    expect(mockEmailSend).not.toHaveBeenCalled()
  })
})

// ─── TESTES: getUnreadCount ─────────────────────────────────────────────────

describe('NotificationService.getUnreadCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('conta apenas notificacoes IN_APP nao lidas do usuario', async () => {
    mockNotifCount.mockResolvedValue(5)

    const result = await NotificationService.getUnreadCount('user-1')

    expect(result).toBe(5)
    expect(mockNotifCount).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        isRead: false,
        channel: NotificationChannel.IN_APP,
      },
    })
  })

  it('retorna 0 quando nao ha notificacoes nao lidas', async () => {
    mockNotifCount.mockResolvedValue(0)

    const result = await NotificationService.getUnreadCount('user-1')

    expect(result).toBe(0)
  })
})
