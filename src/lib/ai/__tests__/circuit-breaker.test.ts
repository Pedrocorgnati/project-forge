import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CircuitBreaker } from '../circuit-breaker'

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker

  beforeEach(() => {
    cb = new CircuitBreaker(3, 60_000)
  })

  it('inicia no estado CLOSED', () => {
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.isOpen()).toBe(false)
  })

  it('permanece CLOSED antes de atingir o threshold', () => {
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.isOpen()).toBe(false)
  })

  it('OPEN após 3 falhas consecutivas', () => {
    cb.recordFailure()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.getState()).toBe('OPEN')
    expect(cb.isOpen()).toBe(true)
  })

  it('HALF-OPEN após resetMs com estado OPEN', () => {
    cb = new CircuitBreaker(3, 100) // resetMs curto para teste
    cb.recordFailure()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.getState()).toBe('OPEN')

    // Simular passagem de tempo
    vi.useFakeTimers()
    vi.advanceTimersByTime(101)
    expect(cb.isOpen()).toBe(false) // isOpen() transiciona para HALF-OPEN
    expect(cb.getState()).toBe('HALF-OPEN')
    vi.useRealTimers()
  })

  it('CLOSED após sucesso em HALF-OPEN', () => {
    cb = new CircuitBreaker(3, 100)
    cb.recordFailure()
    cb.recordFailure()
    cb.recordFailure()

    vi.useFakeTimers()
    vi.advanceTimersByTime(101)
    cb.isOpen() // transiciona para HALF-OPEN

    cb.recordSuccess()
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.getFailureCount()).toBe(0)
    vi.useRealTimers()
  })

  it('isOpen() retorna em < 1ms quando OPEN', () => {
    cb.recordFailure()
    cb.recordFailure()
    cb.recordFailure()

    const start = performance.now()
    cb.isOpen()
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(1)
  })

  it('recordSuccess() reseta o estado completamente', () => {
    cb.recordFailure()
    cb.recordFailure()
    cb.recordSuccess()
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.getFailureCount()).toBe(0)
  })
})
