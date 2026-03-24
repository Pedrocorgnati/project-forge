// src/__tests__/integration/sla-expiry.test.ts
// module-17-clientportal-approvals / TASK-5 ST003
// Testes de integração do SLA Enforcer com vi.mock
// Rastreabilidade: INT-112

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFindMany = vi.fn()
const mockUpdate = vi.fn()
const mockHistoryCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    approvalRequest: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    approvalHistory: {
      create: (...args: unknown[]) => mockHistoryCreate(...args),
    },
  },
}))

const mockSendExpired = vi.fn().mockResolvedValue({ emailSent: true })
const mockSendReminder = vi.fn().mockResolvedValue({ emailSent: true })
const mockLogHistory = vi.fn().mockResolvedValue({})
const mockEventPublish = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/email/send-approval-expired', () => ({
  sendApprovalExpiredEmail: (...args: unknown[]) => mockSendExpired(...args),
}))

vi.mock('@/lib/email/send-sla-reminder', () => ({
  sendSLAReminderEmail: (...args: unknown[]) => mockSendReminder(...args),
}))

vi.mock('@/lib/approvals/log-history', () => ({
  logApprovalHistory: (...args: unknown[]) => mockLogHistory(...args),
}))

vi.mock('@/lib/events/bus', () => ({
  EventBus: { publish: (...args: unknown[]) => mockEventPublish(...args) },
}))

vi.mock('@/lib/constants/events', () => ({
  EventType: {
    APPROVAL_EXPIRED: 'APPROVAL_EXPIRED',
    APPROVAL_REQUESTED: 'APPROVAL_REQUESTED',
    APPROVAL_SUBMITTED: 'APPROVAL_SUBMITTED',
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeApproval(overrides: {
  id?: string
  slaDeadline: Date
  historyLen?: number
  title?: string
}) {
  return {
    id: overrides.id ?? 'apr_test',
    title: overrides.title ?? 'Aprovação de teste',
    status: 'PENDING',
    slaDeadline: overrides.slaDeadline,
    projectId: 'proj_1',
    project: { id: 'proj_1', name: 'Projeto X' },
    requester: { id: 'user_1', email: 'pm@empresa.com', name: 'Ana PM' },
    clientAccess: { clientEmail: 'cliente@empresa.com' },
    history: Array(overrides.historyLen ?? 0).fill({ action: 'REMINDER_SENT' }),
  }
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('SLA Enforcer — expiração e lembretes (integração)', () => {
  const MOCK_NOW = new Date('2026-01-05T12:00:00Z')

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(MOCK_NOW)
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue({})
    mockHistoryCreate.mockResolvedValue({})
  })

  afterEach(() => vi.useRealTimers())

  // ── Expiração ────────────────────────────────────────────────────────────────

  it('expira approval com slaDeadline -73h no passado', async () => {
    const { runSLAEnforcer } = await import('@/lib/sla/enforcer')
    const slaDeadline = new Date(MOCK_NOW.getTime() - 73 * 60 * 60 * 1000) // 73h atrás

    mockFindMany.mockResolvedValue([makeApproval({ slaDeadline })])

    const result = await runSLAEnforcer()

    expect(result.expired).toBe(1)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'EXPIRED' } }),
    )
  })

  it('registra EXPIRED em approval_history com actorId undefined (ação de sistema)', async () => {
    const { runSLAEnforcer } = await import('@/lib/sla/enforcer')
    const slaDeadline = new Date(MOCK_NOW.getTime() - 73 * 60 * 60 * 1000)

    mockFindMany.mockResolvedValue([makeApproval({ slaDeadline })])

    await runSLAEnforcer()

    expect(mockLogHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EXPIRED',
        actorId: undefined,
      }),
    )
  })

  it('comment da entrada EXPIRED menciona "72 horas"', async () => {
    const { runSLAEnforcer } = await import('@/lib/sla/enforcer')
    const slaDeadline = new Date(MOCK_NOW.getTime() - 73 * 60 * 60 * 1000)

    mockFindMany.mockResolvedValue([makeApproval({ slaDeadline })])

    await runSLAEnforcer()

    expect(mockLogHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        comment: expect.stringContaining('72 horas'),
      }),
    )
  })

  it('sendApprovalExpiredEmail chamado 1x por approval expirada', async () => {
    const { runSLAEnforcer } = await import('@/lib/sla/enforcer')
    const slaDeadline = new Date(MOCK_NOW.getTime() - 73 * 60 * 60 * 1000)

    mockFindMany.mockResolvedValue([makeApproval({ slaDeadline })])

    await runSLAEnforcer()

    expect(mockSendExpired).toHaveBeenCalledTimes(1)
    expect(mockSendExpired).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'pm@empresa.com' }),
    )
  })

  // ── Lembretes ────────────────────────────────────────────────────────────────

  it('envia lembrete quando 23h restantes (janela 22-26h)', async () => {
    const { runSLAEnforcer } = await import('@/lib/sla/enforcer')
    const slaDeadline = new Date(MOCK_NOW.getTime() + 23 * 60 * 60 * 1000) // 23h à frente

    mockFindMany.mockResolvedValue([
      makeApproval({ slaDeadline, historyLen: 0 }),
    ])

    const result = await runSLAEnforcer()

    expect(result.reminded).toBe(1)
    expect(mockSendReminder).toHaveBeenCalledTimes(1)
  })

  it('não envia lembrete duplicado quando REMINDER_SENT já existe em history', async () => {
    const { runSLAEnforcer } = await import('@/lib/sla/enforcer')
    const slaDeadline = new Date(MOCK_NOW.getTime() + 23 * 60 * 60 * 1000)

    // Segunda execução: history tem 1 entrada REMINDER_SENT
    mockFindMany.mockResolvedValue([
      makeApproval({ slaDeadline, historyLen: 1 }),
    ])

    const result = await runSLAEnforcer()

    expect(result.reminded).toBe(0)
    expect(mockSendReminder).not.toHaveBeenCalled()
  })

  // ── Aprovações fora do escopo ────────────────────────────────────────────────

  it('não processa approval com slaDeadline +48h (fora da janela)', async () => {
    const { runSLAEnforcer } = await import('@/lib/sla/enforcer')
    const slaDeadline = new Date(MOCK_NOW.getTime() + 48 * 60 * 60 * 1000)

    mockFindMany.mockResolvedValue([makeApproval({ slaDeadline })])

    const result = await runSLAEnforcer()

    expect(result.expired).toBe(0)
    expect(result.reminded).toBe(0)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockSendReminder).not.toHaveBeenCalled()
    expect(mockSendExpired).not.toHaveBeenCalled()
  })

  // ── Resiliência ──────────────────────────────────────────────────────────────

  it('acumula erros individuais sem parar o processamento das demais', async () => {
    const { runSLAEnforcer } = await import('@/lib/sla/enforcer')

    mockFindMany.mockResolvedValue([
      makeApproval({
        id: 'apr_fail',
        slaDeadline: new Date(MOCK_NOW.getTime() - 73 * 60 * 60 * 1000),
      }),
      makeApproval({
        id: 'apr_ok',
        slaDeadline: new Date(MOCK_NOW.getTime() + 48 * 60 * 60 * 1000),
      }),
    ])
    mockUpdate.mockRejectedValueOnce(new Error('DB timeout'))

    const result = await runSLAEnforcer()

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('apr_fail')
    // apr_ok foi processada (sem ação necessária pois fora da janela)
  })
})
