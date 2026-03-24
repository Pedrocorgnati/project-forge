import { vi, describe, it, expect, beforeEach } from 'vitest'
import { EmailQueue } from '../email-queue'

// ─── MOCK PRISMA ──────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    emailLog: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/constants/notifications', () => ({
  NOTIFICATION_LIMITS: {
    DEDUP_WINDOW_MS: 5 * 60 * 1000,
  },
}))

import { prisma } from '@/lib/db'

const mockCount = vi.mocked(prisma.emailLog.count)
const mockCreate = vi.mocked(prisma.emailLog.create)
const mockUpdate = vi.mocked(prisma.emailLog.update)

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('EmailQueue.isDuplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna false para email novo (count = 0)', async () => {
    mockCount.mockResolvedValue(0)
    const result = await EmailQueue.isDuplicate('user@test.com', 'APPROVAL_REQUESTED')
    expect(result).toBe(false)
  })

  it('retorna true para mesmo email/tipo dentro de DEDUP_WINDOW_MS (status SENT)', async () => {
    mockCount.mockResolvedValue(1)
    const result = await EmailQueue.isDuplicate('user@test.com', 'APPROVAL_REQUESTED', 'proj-1')
    expect(result).toBe(true)
  })

  it('retorna true para mesmo email/tipo com status PENDING', async () => {
    mockCount.mockResolvedValue(1)
    const result = await EmailQueue.isDuplicate('user@test.com', 'SCOPE_ALERT_TRIGGERED')
    expect(result).toBe(true)
  })

  it('verifica com status IN(SENT, PENDING) — FAILED não conta', async () => {
    mockCount.mockResolvedValue(0) // FAILED foi excluído do filtro
    const result = await EmailQueue.isDuplicate('user@test.com', 'PROJECT_CREATED')
    expect(result).toBe(false)
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['SENT', 'PENDING'] },
        }),
      }),
    )
  })

  it('retorna false após DEDUP_WINDOW_MS (janela expirada)', async () => {
    mockCount.mockResolvedValue(0) // janela expirada → count = 0
    const result = await EmailQueue.isDuplicate('user@test.com', 'BRIEF_PRD_APPROVED')
    expect(result).toBe(false)
  })
})

describe('EmailQueue.enqueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({} as never)
  })

  it('cria EmailLog PENDING e retorna true para email novo', async () => {
    mockCount.mockResolvedValue(0)
    const result = await EmailQueue.enqueue({
      to: 'user@test.com',
      type: 'APPROVAL_REQUESTED',
      subject: 'Aprovação pendente',
    })
    expect(result).toBe(true)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING' }),
      }),
    )
  })

  it('retorna false sem criar EmailLog para duplicata detectada', async () => {
    mockCount.mockResolvedValue(1) // duplicata
    const result = await EmailQueue.enqueue({
      to: 'user@test.com',
      type: 'APPROVAL_REQUESTED',
      subject: 'Aprovação pendente',
    })
    expect(result).toBe(false)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('retorna true e cria novo EmailLog quando status anterior era FAILED', async () => {
    mockCount.mockResolvedValue(0) // FAILED não conta na dedup → count = 0
    const result = await EmailQueue.enqueue({
      to: 'user@test.com',
      type: 'SCOPE_ALERT_TRIGGERED',
      subject: 'Alerta de escopo',
      projectId: 'proj-1',
    })
    expect(result).toBe(true)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })
})

describe('EmailQueue.updateStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue({} as never)
  })

  it('atualiza status para SENT com resendMessageId', async () => {
    await EmailQueue.updateStatus('log-1', 'SENT', 'msg-abc123')
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: { status: 'SENT', resendMessageId: 'msg-abc123' },
    })
  })

  it('atualiza status para BOUNCED sem resendMessageId', async () => {
    await EmailQueue.updateStatus('log-2', 'BOUNCED')
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'log-2' },
      data: { status: 'BOUNCED', resendMessageId: null },
    })
  })
})
