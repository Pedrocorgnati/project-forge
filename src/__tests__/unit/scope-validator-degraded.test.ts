// ─── SCOPE VALIDATOR DEGRADED MODE TESTS ─────────────────────────────────────
// module-10-scopeshield-validation / TASK-4 / ST002
// Rastreabilidade: INT-070

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── MOCKS ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/ai/claude-cli-provider', () => ({
  ClaudeCliProvider: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    brief: { findFirst: vi.fn() },
    estimate: { findFirst: vi.fn() },
    task: { findMany: vi.fn() },
    scopeAlert: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/events', () => ({
  EventBus: { publish: vi.fn() },
}))

vi.mock('@/lib/constants/events', () => ({
  EventType: { SCOPE_ALERT_CREATED: 'SCOPE_ALERT_CREATED' },
}))

import { ScopeValidator } from '@/lib/services/scope-validator'
import { ScopeAlertService } from '@/lib/services/scope-alert-service'
import { prisma } from '@/lib/db'
import { ClaudeCliProvider } from '@/lib/ai/claude-cli-provider'

// ─── COUNTER for unique task IDs ──────────────────────────────────────────────

let idCounter = 200

function nextTaskId(): string {
  return `00000000-0000-0000-0000-${String(++idCounter).padStart(12, '0')}`
}

const baseInput = {
  taskId: '00000000-0000-0000-0000-000000000201',
  projectId: '00000000-0000-0000-0000-000000000002',
  taskTitle: 'Task qualquer',
}

function setupValidBrief() {
  vi.mocked(prisma.brief.findFirst).mockResolvedValue({
    id: 'brief-1',
    sessions: [{
      status: 'COMPLETED',
      questions: [
        { questionText: 'Q1?', answerText: 'A1', order: 1 },
      ],
    }],
  } as any)
  vi.mocked(prisma.estimate.findFirst).mockResolvedValue({
    status: 'READY',
    items: [{ category: 'frontend', description: 'Dashboard' }],
  } as any)
  vi.mocked(prisma.task.findMany).mockResolvedValue([])
}

// ─── DEGRADED MODE — SCOPE VALIDATOR ─────────────────────────────────────────

describe('ScopeValidator — Degraded Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupValidBrief()
  })
  afterEach(() => vi.unstubAllEnvs())

  it('[DEGRADED] retorna degraded=true quando AI lança exceção', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    ;(ClaudeCliProvider as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        generate: vi.fn().mockRejectedValue(new Error('Connection refused')),
        isAvailable: vi.fn().mockResolvedValue(false),
      }
    })

    const validator = new ScopeValidator()
    const input = { ...baseInput, taskId: nextTaskId() }
    const { degraded, result } = await validator.validate(input)

    expect(degraded).toBe(true)
    expect(result).toBeNull()
  })

  it('[DEGRADED] retorna degraded=true quando AI retorna schema inválido', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    ;(ClaudeCliProvider as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        generate: vi.fn().mockResolvedValue('{"invalid_field": "some value"}'),
        isAvailable: vi.fn().mockResolvedValue(true),
      }
    })

    const validator = new ScopeValidator()
    const input = { ...baseInput, taskId: nextTaskId() }
    const { degraded } = await validator.validate(input)

    expect(degraded).toBe(true)
  })

  it('[DEGRADED] retorna degraded=true quando Brief não existe no banco', async () => {
    vi.mocked(prisma.brief.findFirst).mockResolvedValue(null)

    const validator = new ScopeValidator()
    const input = { ...baseInput, projectId: 'proj-sem-brief', taskId: nextTaskId() }
    const { degraded } = await validator.validate(input)

    expect(degraded).toBe(true)
  })
})

// ─── DEGRADED MODE — SCOPE ALERT SERVICE ─────────────────────────────────────

describe('ScopeAlertService — Degraded Mode não bloqueia criação de task', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('[DEGRADED] não cria alerta e não lança exceção quando AI está down', async () => {
    // AI indisponível (sem brief válido → degraded=true)
    vi.mocked(prisma.brief.findFirst).mockResolvedValue(null)

    const service = new ScopeAlertService()
    await expect(
      service.validateAndCreateAlerts(baseInput),
    ).resolves.toBeUndefined()

    expect(prisma.scopeAlert.create).not.toHaveBeenCalled()
  })

  it('[DEGRADED] não publica evento SCOPE_ALERT_CREATED quando degraded', async () => {
    const { EventBus } = await import('@/lib/events')
    vi.mocked(prisma.brief.findFirst).mockResolvedValue(null)

    const service = new ScopeAlertService()
    await service.validateAndCreateAlerts(baseInput)

    expect(EventBus.publish).not.toHaveBeenCalled()
  })
})
