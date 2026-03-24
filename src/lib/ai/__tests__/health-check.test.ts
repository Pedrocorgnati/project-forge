import { describe, it, expect, vi } from 'vitest'

// ─── MOCK DO child_process ────────────────────────────────────────────────────

const mockSpawn = vi.fn()

vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}))

const { checkAIHealth } = await import('../health-check')

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function makeProcess(exitCode: number, delay = 0, error?: Error) {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {}
  const child = {
    killed: false,
    kill: vi.fn(() => { child.killed = true }),
    on: (event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = listeners[event] ?? []
      listeners[event].push(cb)
    },
  }
  setTimeout(() => {
    if (error) {
      ;(listeners['error'] ?? []).forEach((cb) => cb(error))
    } else {
      ;(listeners['close'] ?? []).forEach((cb) => cb(exitCode))
    }
  }, delay)
  return child
}

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('checkAIHealth', () => {
  it('retorna { available: true, latencyMs } quando CLI presente', async () => {
    mockSpawn.mockReturnValue(makeProcess(0))
    const result = await checkAIHealth()
    expect(result.available).toBe(true)
    expect(result.latencyMs).toBeTypeOf('number')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('retorna { available: false } quando CLI ausente (ENOENT)', async () => {
    mockSpawn.mockReturnValue(makeProcess(1, 0, new Error('spawn ENOENT')))
    const result = await checkAIHealth()
    expect(result.available).toBe(false)
    expect(result.latencyMs).toBeUndefined()
  })

  it('retorna em ≤ timeoutMs quando CLI não responde', async () => {
    // Processo que nunca responde
    mockSpawn.mockReturnValue(makeProcess(0, 99999))
    const start = Date.now()
    const result = await checkAIHealth(100)
    const elapsed = Date.now() - start
    expect(result.available).toBe(false)
    expect(elapsed).toBeLessThan(500) // margem generosa
  })

  it('nunca lança exceção', async () => {
    mockSpawn.mockImplementation(() => { throw new Error('spawn crashed') })
    await expect(checkAIHealth()).resolves.toMatchObject({ available: false })
  })
})
