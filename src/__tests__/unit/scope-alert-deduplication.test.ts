// ─── SCOPE ALERT DEDUPLICATION TESTS ─────────────────────────────────────────
// module-10-scopeshield-validation / TASK-5 / ST001
// Rastreabilidade: INT-071

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── MOCKS ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/services/scope-validator', () => ({
  ScopeValidator: vi.fn().mockImplementation(function () {
    return {
      validate: vi.fn().mockResolvedValue({
        result: {
          classification: 'SCOPE_CREEP',
          severity: 'HIGH',
          description: 'Nova funcionalidade não prevista',
          rationale: 'Não está no estimate original',
          relatedTaskId: null,
        },
        fromCache: false,
        degraded: false,
      }),
    }
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    scopeAlert: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/events', () => ({
  EventBus: { publish: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/lib/constants/events', () => ({
  EventType: { SCOPE_ALERT_CREATED: 'SCOPE_ALERT_CREATED' },
}))

// ─── IMPORTS ──────────────────────────────────────────────────────────────────

import { ScopeAlertService } from '@/lib/services/scope-alert-service'
import { prisma } from '@/lib/db'
import { EventBus } from '@/lib/events'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const input = {
  taskId: '00000000-0000-4000-8000-000000000011',
  projectId: '00000000-0000-4000-8000-000000000001',
  taskTitle: 'Task de Deduplicação',
}

const mockCreatedAlert = {
  id: 'alert-new-001',
  type: 'SCOPE_CREEP',
  severity: 'HIGH',
  projectId: input.projectId,
  taskId: input.taskId,
  status: 'OPEN',
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('ScopeAlertService — Deduplicação', () => {
  beforeEach(() => vi.clearAllMocks())

  it('[SUCCESS] cria alerta na primeira validação (findFirst retorna null)', async () => {
    vi.mocked(prisma.scopeAlert.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.scopeAlert.create).mockResolvedValue(mockCreatedAlert as any)

    const service = new ScopeAlertService()
    await service.validateAndCreateAlerts(input)

    expect(prisma.scopeAlert.create).toHaveBeenCalledTimes(1)
    expect(prisma.scopeAlert.update).not.toHaveBeenCalled()
    expect(EventBus.publish).toHaveBeenCalledTimes(1)
    expect(EventBus.publish).toHaveBeenCalledWith(
      'SCOPE_ALERT_CREATED',
      input.projectId,
      expect.objectContaining({ alertId: mockCreatedAlert.id, taskId: input.taskId }),
      'module-10-scopeshield-validation',
    )
  })

  it('[SUCCESS] atualiza alerta existente na re-validação (não duplica)', async () => {
    vi.mocked(prisma.scopeAlert.findFirst).mockResolvedValue({
      id: 'alert-existing-001',
      type: 'SCOPE_CREEP',
      status: 'OPEN',
      taskId: input.taskId,
    } as any)
    vi.mocked(prisma.scopeAlert.update).mockResolvedValue({ id: 'alert-existing-001' } as any)

    const service = new ScopeAlertService()
    await service.validateAndCreateAlerts(input)

    expect(prisma.scopeAlert.create).not.toHaveBeenCalled()
    expect(prisma.scopeAlert.update).toHaveBeenCalledTimes(1)
    // Evento NÃO publicado em update — apenas em criação
    expect(EventBus.publish).not.toHaveBeenCalled()
  })

  it('[EDGE] cria novo alerta após DISMISSED (findFirst com not DISMISSED retorna null)', async () => {
    // O findFirst usa { status: { not: 'DISMISSED' } } — não encontra alerta ativo
    vi.mocked(prisma.scopeAlert.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.scopeAlert.create).mockResolvedValue(mockCreatedAlert as any)

    const service = new ScopeAlertService()
    await service.validateAndCreateAlerts(input)

    // Novo alerta criado mesmo que o anterior tenha sido dismissado
    expect(prisma.scopeAlert.create).toHaveBeenCalledTimes(1)
    expect(EventBus.publish).toHaveBeenCalledTimes(1)
  })
})
