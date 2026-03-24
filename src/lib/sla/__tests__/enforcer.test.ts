// src/lib/sla/__tests__/enforcer.test.ts
// module-17-clientportal-approvals / TASK-2 ST005
// Testes de integração do SLAEnforcer com vi.mock
// Rastreabilidade: INT-107

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

// ── Helper ────────────────────────────────────────────────────────────────────

function makeApproval(overrides: {
  id?: string
  slaDeadline: Date
  historyLen?: number
  title?: string
} ) {
  return {
    id: overrides.id ?? 'apr_test',
    title: overrides.title ?? 'Aprovação de PRD',
    status: 'PENDING',
    slaDeadline: overrides.slaDeadline,
    projectId: 'proj_1',
    project: { id: 'proj_1', name: 'Projeto X' },
    requester: { id: 'user_1', email: 'pm@empresa.com', name: 'Ana PM' },
    clientAccess: { clientEmail: 'cliente@empresa.com' },
    history: Array(overrides.historyLen ?? 0).fill({ action: 'REMINDER_SENT' }),
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runSLAEnforcer', () => {
  const MOCK_NOW = new Date('2026-01-05T12:00:00Z')

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(MOCK_NOW)
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue({})
    mockHistoryCreate.mockResolvedValue({})
  })

  afterEach(() => vi.useRealTimers())

  it('expira aprovação com slaDeadline no passado', async () => {
    const { runSLAEnforcer } = await import('../enforcer')
    mockFindMany.mockResolvedValue([
      makeApproval({ slaDeadline: new Date('2026-01-01T00:00:00Z') }),
    ])

    const result = await runSLAEnforcer()

    expect(result.expired).toBe(1)
    expect(result.reminded).toBe(0)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'EXPIRED' } }),
    )
  })

  it('registra EXPIRED em approval_history com actorId undefined', async () => {
    const { runSLAEnforcer } = await import('../enforcer')
    mockFindMany.mockResolvedValue([
      makeApproval({ slaDeadline: new Date('2026-01-01T00:00:00Z') }),
    ])

    await runSLAEnforcer()

    expect(mockLogHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EXPIRED',
        actorId: undefined,
      }),
    )
  })

  it('envia email de expiração ao requester', async () => {
    const { runSLAEnforcer } = await import('../enforcer')
    mockFindMany.mockResolvedValue([
      makeApproval({ slaDeadline: new Date('2026-01-01T00:00:00Z') }),
    ])

    await runSLAEnforcer()

    expect(mockSendExpired).toHaveBeenCalledTimes(1)
    expect(mockSendExpired).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'pm@empresa.com' }),
    )
  })

  it('envia lembrete na janela 22-26h sem histórico de reminder', async () => {
    const { runSLAEnforcer } = await import('../enforcer')
    // 24h à frente = dentro da janela
    mockFindMany.mockResolvedValue([
      makeApproval({ slaDeadline: new Date('2026-01-06T12:00:00Z'), historyLen: 0 }),
    ])

    const result = await runSLAEnforcer()

    expect(result.reminded).toBe(1)
    expect(mockSendReminder).toHaveBeenCalledTimes(1)
  })

  it('não envia lembrete duplicado quando REMINDER_SENT já existe em history', async () => {
    const { runSLAEnforcer } = await import('../enforcer')
    mockFindMany.mockResolvedValue([
      makeApproval({ slaDeadline: new Date('2026-01-06T12:00:00Z'), historyLen: 1 }),
    ])

    const result = await runSLAEnforcer()

    expect(result.reminded).toBe(0)
    expect(mockSendReminder).not.toHaveBeenCalled()
  })

  it('não processa aprovações com slaDeadline no futuro fora da janela', async () => {
    const { runSLAEnforcer } = await import('../enforcer')
    mockFindMany.mockResolvedValue([
      makeApproval({ slaDeadline: new Date('2026-01-10T12:00:00Z') }),
    ])

    const result = await runSLAEnforcer()

    expect(result.expired).toBe(0)
    expect(result.reminded).toBe(0)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('continua processando demais aprovações quando uma falha', async () => {
    const { runSLAEnforcer } = await import('../enforcer')
    mockFindMany.mockResolvedValue([
      makeApproval({ id: 'apr_fail', slaDeadline: new Date('2026-01-01T00:00:00Z') }),
      makeApproval({ id: 'apr_future', slaDeadline: new Date('2026-01-10T12:00:00Z') }),
    ])
    mockUpdate.mockRejectedValueOnce(new Error('DB timeout'))

    const result = await runSLAEnforcer()

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('apr_fail')
  })
})
