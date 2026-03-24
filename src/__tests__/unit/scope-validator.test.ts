// ─── SCOPE VALIDATOR TESTS ────────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-2 / ST004
// Rastreabilidade: INT-066, INT-068

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ScopeValidator } from '@/lib/services/scope-validator'

// ─── MOCKS ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    brief: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'brief-1',
        sessions: [
          {
            status: 'COMPLETED',
            questions: [
              { questionText: 'O que o sistema faz?', answerText: 'Sistema de gestão de projetos para agências', order: 1 },
              { questionText: 'Qual o público-alvo?', answerText: 'Agências de software pequenas', order: 2 },
            ],
          },
        ],
      }),
    },
    estimate: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'est-1',
        status: 'READY',
        items: [
          { category: 'auth-system', description: 'Autenticação JWT e RBAC' },
          { category: 'project-management', description: 'CRUD de projetos e tarefas' },
        ],
      }),
    },
    task: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'task-existing-1', title: 'Setup autenticação JWT', description: 'Configurar JWT e sessões', status: 'DONE' },
        { id: 'task-existing-2', title: 'CRUD projetos', description: 'API REST de projetos', status: 'TODO' },
      ]),
    },
  },
}))

vi.mock('@/lib/ai/claude-cli-provider', () => ({
  ClaudeCliProvider: vi.fn(),
}))

// ─── COUNTER for unique task IDs ──────────────────────────────────────────────

let idCounter = 100

function nextTaskId(): string {
  return `00000000-0000-0000-0000-${String(++idCounter).padStart(12, '0')}`
}

const PROJECT_ID = '00000000-0000-0000-0000-000000000002'

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('ScopeValidator', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllEnvs())

  it('[SUCCESS] retorna IN_SCOPE para task dentro do escopo (NODE_ENV=test → mock)', async () => {
    // Em NODE_ENV=test, ScopeValidator usa mockAIResponse interno (IN_SCOPE)
    const validator = new ScopeValidator()
    const { result, degraded } = await validator.validate({
      taskId: nextTaskId(),
      projectId: PROJECT_ID,
      taskTitle: 'Implementar módulo de cupons',
    })

    expect(degraded).toBe(false)
    expect(result).not.toBeNull()
    expect(result?.classification).toBe('IN_SCOPE')
  })

  it('[SUCCESS] retorna fromCache=true na segunda chamada para mesma task', async () => {
    const validator = new ScopeValidator()
    const taskId = nextTaskId() // ID único para este teste

    const first = await validator.validate({ taskId, projectId: PROJECT_ID, taskTitle: 'Task A' })
    const second = await validator.validate({ taskId, projectId: PROJECT_ID, taskTitle: 'Task A' })

    expect(first.fromCache).toBe(false)
    expect(second.fromCache).toBe(true)
    expect(second.result?.classification).toBe(first.result?.classification)
  })

  it('[DEGRADED] retorna degraded=true quando Brief não existe', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.brief.findFirst).mockResolvedValueOnce(null)

    const validator = new ScopeValidator()
    const { result, degraded } = await validator.validate({
      taskId: nextTaskId(),
      projectId: 'proj-sem-brief',
      taskTitle: 'Qualquer task',
    })

    expect(degraded).toBe(true)
    expect(result).toBeNull()
  })

  it('[ERROR] retorna degraded=true e result=null quando AI lança exceção (não-test env)', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const { ClaudeCliProvider } = await import('@/lib/ai/claude-cli-provider')
    ;(ClaudeCliProvider as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        generate: vi.fn().mockRejectedValue(new Error('Connection refused')),
        isAvailable: vi.fn().mockResolvedValue(false),
      }
    })

    const validator = new ScopeValidator()
    const { result, degraded } = await validator.validate({
      taskId: nextTaskId(),
      projectId: PROJECT_ID,
      taskTitle: 'Task com AI down',
    })

    expect(degraded).toBe(true)
    expect(result).toBeNull()
  })

  it('[ERROR] retorna degraded=true quando resposta não é JSON válido (não-test env)', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const { ClaudeCliProvider } = await import('@/lib/ai/claude-cli-provider')
    ;(ClaudeCliProvider as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        generate: vi.fn().mockResolvedValue('Resposta em texto livre sem JSON'),
        isAvailable: vi.fn().mockResolvedValue(true),
      }
    })

    const validator = new ScopeValidator()
    const { result, degraded } = await validator.validate({
      taskId: nextTaskId(),
      projectId: PROJECT_ID,
      taskTitle: 'Task com JSON inválido',
    })

    expect(degraded).toBe(true)
    expect(result).toBeNull()
  })

  it('[EDGE] extrai JSON mesmo com markdown wrapper (não-test env)', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const { ClaudeCliProvider } = await import('@/lib/ai/claude-cli-provider')
    ;(ClaudeCliProvider as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        generate: vi.fn().mockResolvedValue(
          '```json\n{"classification":"SCOPE_CREEP","severity":"HIGH","description":"Nova funcionalidade","rationale":"Não estava no estimate","relatedTaskId":null}\n```',
        ),
        isAvailable: vi.fn().mockResolvedValue(true),
      }
    })

    const validator = new ScopeValidator()
    const { result, degraded } = await validator.validate({
      taskId: nextTaskId(),
      projectId: PROJECT_ID,
      taskTitle: 'Task com markdown wrapper',
    })

    expect(degraded).toBe(false)
    expect(result?.classification).toBe('SCOPE_CREEP')
    expect(result?.severity).toBe('HIGH')
  })
})
