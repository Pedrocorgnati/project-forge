// src/lib/portal/__tests__/invite-rate-limit.test.ts
// module-16-clientportal-auth / TASK-4 ST002
// Testes unitários para checkInviteRateLimit
// Rastreabilidade: INT-102

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Reimportar fresh a cada teste para limpar state do Map
let checkInviteRateLimit: typeof import('../invite-rate-limit').checkInviteRateLimit

describe('checkInviteRateLimit', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    // Reimportar para limpar o Map interno
    vi.resetModules()
    const mod = await import('../invite-rate-limit')
    checkInviteRateLimit = mod.checkInviteRateLimit
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('permite 10 convites para o mesmo projeto', () => {
    for (let i = 0; i < 10; i++) {
      const result = checkInviteRateLimit('proj-1')
      expect(result.allowed).toBe(true)
    }
  })

  it('bloqueia o 11º convite com retryAfter', () => {
    for (let i = 0; i < 10; i++) {
      checkInviteRateLimit('proj-1')
    }

    const result = checkInviteRateLimit('proj-1')
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.retryAfter).toBeGreaterThan(0)
    }
  })

  it('projetos diferentes não interferem entre si', () => {
    for (let i = 0; i < 10; i++) {
      checkInviteRateLimit('proj-1')
    }

    // proj-2 ainda deve ter quota
    const result = checkInviteRateLimit('proj-2')
    expect(result.allowed).toBe(true)
  })

  it('libera quota após 1 hora', () => {
    for (let i = 0; i < 10; i++) {
      checkInviteRateLimit('proj-1')
    }

    // Avançar 1 hora + 1ms
    vi.advanceTimersByTime(60 * 60 * 1000 + 1)

    const result = checkInviteRateLimit('proj-1')
    expect(result.allowed).toBe(true)
  })
})
