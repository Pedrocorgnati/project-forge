// ─── SCOPE VALIDATOR PERFORMANCE TESTS ───────────────────────────────────────
// module-10-scopeshield-validation / TASK-5 / ST003
// Rastreabilidade: INT-071

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
  },
}))

// ─── IMPORTS ──────────────────────────────────────────────────────────────────

import { ScopeValidator } from '@/lib/services/scope-validator'
import { ClaudeCliProvider } from '@/lib/ai/claude-cli-provider'
import { prisma } from '@/lib/db'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

let idCounter = 300
function nextPerfTaskId(): string {
  return `00000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}`
}

const PERF_PROJECT_ID = '00000000-0000-4000-8000-000000000003'

const VALID_AI_RESPONSE = JSON.stringify({
  classification: 'IN_SCOPE',
  severity: 'LOW',
  description: 'Task dentro do escopo.',
  rationale: 'Prevista no estimate.',
  relatedTaskId: null,
})

function setupValidBrief() {
  vi.mocked(prisma.brief.findFirst).mockResolvedValue({
    id: 'brief-perf',
    sessions: [{
      status: 'COMPLETED',
      questions: [
        { questionText: 'O que o sistema faz?', answerText: 'Sistema de gestão', order: 1 },
      ],
    }],
  } as any)
  vi.mocked(prisma.estimate.findFirst).mockResolvedValue({
    status: 'READY',
    items: [{ category: 'backend', description: 'API REST' }],
  } as any)
  vi.mocked(prisma.task.findMany).mockResolvedValue([])
}

// ─── TIMEOUT TESTS (fake timers) ──────────────────────────────────────────────
// Executados em arquivo isolado de timers para evitar interferência de estado.

describe('ScopeValidator — Timeout Gracioso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupValidBrief()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('[DEGRADED] faz timeout gracioso quando AI não responde', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    ;(ClaudeCliProvider as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        generate: vi.fn().mockImplementation(() => new Promise(() => {})),
      }
    })

    const validator = new ScopeValidator()
    const validatePromise = validator.validate({
      taskId: nextPerfTaskId(),
      projectId: PERF_PROJECT_ID,
      taskTitle: 'Task com AI lenta',
    })

    await vi.runAllTimersAsync()
    const { degraded } = await validatePromise

    expect(degraded).toBe(true)
  })
})

// ─── PARALELISMO E CACHE (real timers) ────────────────────────────────────────

describe('ScopeValidator — Paralelismo e Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupValidBrief()
    // Sem fake timers — geração resolve imediatamente antes do timeout de 5s
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('[EDGE] 5 validações paralelas completam sem race condition', async () => {
    // NODE_ENV=test → ScopeValidator.mockAIResponse() direto (sem Promise.race com timer real)
    // Objetivo: verificar ausência de race condition e isolamento de cache entre tasks únicas

    const validator = new ScopeValidator()
    const tasks = Array.from({ length: 5 }, () => ({
      taskId: nextPerfTaskId(),
      projectId: PERF_PROJECT_ID,
      taskTitle: 'Task paralela',
    }))

    const results = await Promise.all(tasks.map(t => validator.validate(t)))

    expect(results).toHaveLength(5)
    expect(results.every(r => !r.degraded)).toBe(true)
    expect(results.every(r => r.result?.classification === 'IN_SCOPE')).toBe(true)
    // IDs únicos → cada task processada independentemente (sem cache compartilhado)
    expect(results.every(r => r.fromCache === false)).toBe(true)
  })

  it('[SUCCESS] segunda chamada para mesma task usa cache (0 chamadas ao AI)', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    let aiCallCount = 0
    ;(ClaudeCliProvider as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        generate: vi.fn().mockImplementation(async () => {
          aiCallCount++
          return VALID_AI_RESPONSE
        }),
      }
    })

    const validator = new ScopeValidator()
    const input = {
      taskId: nextPerfTaskId(),
      projectId: PERF_PROJECT_ID,
      taskTitle: 'Task com cache',
    }

    const first = await validator.validate(input)
    const second = await validator.validate(input)

    expect(first.fromCache).toBe(false)
    expect(second.fromCache).toBe(true)
    // AI só foi chamado uma vez — segunda veio do cache
    expect(aiCallCount).toBe(1)
  })
})
