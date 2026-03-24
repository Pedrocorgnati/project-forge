// ─── SCOPE VALIDATOR CACHE TESTS ─────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-5 / ST002
// Rastreabilidade: INT-071

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ScopeValidatorCache } from '@/lib/services/scope-validator-cache'

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('ScopeValidatorCache', () => {
  let cache: ScopeValidatorCache

  beforeEach(() => {
    cache = new ScopeValidatorCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('[SUCCESS] retorna null para chave inexistente', () => {
    const result = cache.get('proj-cache:task-nonexistent')
    expect(result).toBeNull()
  })

  it('[SUCCESS] retorna valor dentro do TTL', () => {
    const data = { classification: 'IN_SCOPE', severity: 'LOW' }
    cache.set('proj-cache:task-hit', data)
    const result = cache.get<typeof data>('proj-cache:task-hit')
    expect(result).toEqual(data)
  })

  it('[EDGE] retorna null após expiração do TTL (61 minutos)', () => {
    const data = { classification: 'SCOPE_CREEP' }
    cache.set('proj-cache:task-ttl', data)

    // Avançar 61 minutos — além do TTL de 1h
    vi.advanceTimersByTime(61 * 60 * 1000)

    const result = cache.get('proj-cache:task-ttl')
    expect(result).toBeNull()
  })

  it('[SUCCESS] invalida apenas chaves do projeto especificado', () => {
    cache.set('proj-A:task-1', { classification: 'IN_SCOPE' })
    cache.set('proj-A:task-2', { classification: 'SCOPE_CREEP' })
    cache.set('proj-B:task-3', { classification: 'IN_SCOPE' }) // Projeto diferente

    cache.invalidateProject('proj-A')

    expect(cache.get('proj-A:task-1')).toBeNull()
    expect(cache.get('proj-A:task-2')).toBeNull()
    expect(cache.get('proj-B:task-3')).not.toBeNull() // Não afetado
  })

  it('[EDGE] invalidateProject não afeta chaves de outros projetos com prefixo similar', () => {
    cache.set('proj-1:task-a', { classification: 'IN_SCOPE' })
    cache.set('proj-10:task-a', { classification: 'SCOPE_CREEP' }) // "proj-1" é prefixo de "proj-10"

    cache.invalidateProject('proj-1')

    expect(cache.get('proj-1:task-a')).toBeNull()
    // "proj-10:task-a" não começa com "proj-1:" (começa com "proj-10:") → preservado
    expect(cache.get('proj-10:task-a')).not.toBeNull()
  })
})
