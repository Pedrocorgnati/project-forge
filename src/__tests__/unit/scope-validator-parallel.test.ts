import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/ai/claude-cli-provider', () => ({ ClaudeCliProvider: vi.fn() }))
vi.mock('@/lib/db', () => ({
  prisma: {
    brief: { findFirst: vi.fn() },
    estimate: { findFirst: vi.fn() },
    task: { findMany: vi.fn() },
  },
}))

import { ScopeValidator } from '@/lib/services/scope-validator'
import { ClaudeCliProvider } from '@/lib/ai/claude-cli-provider'
import { prisma } from '@/lib/db'

const VALID = '{"classification":"IN_SCOPE","severity":"LOW","description":"OK","rationale":"OK","relatedTaskId":null}'

describe('parallel only', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.brief.findFirst).mockResolvedValue({ id: 'b', sessions: [{ status: 'COMPLETED', questions: [{ questionText: 'Q', answerText: 'A', order: 1 }] }] } as any)
    vi.mocked(prisma.estimate.findFirst).mockResolvedValue({ status: 'READY', items: [] } as any)
    vi.mocked(prisma.task.findMany).mockResolvedValue([])
  })
  afterEach(() => vi.unstubAllEnvs())

  it('5 parallel tasks', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    let count = 0
    ;(ClaudeCliProvider as any).mockImplementation(function() {
      return { generate: vi.fn().mockImplementation(async () => { count++; return VALID }) }
    })
    const v = new ScopeValidator()
    const r = await Promise.all([1,2,3,4,5].map(i => v.validate({
      taskId: `00000000-0000-4000-8000-00000000000${i}`, projectId: 'proj', taskTitle: `T${i}`
    })))
    expect(r.every(x => !x.degraded)).toBe(true)
    expect(count).toBe(5)
  }, 8000)
})
