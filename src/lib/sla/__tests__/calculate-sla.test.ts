// src/lib/sla/__tests__/calculate-sla.test.ts
// module-17-clientportal-approvals / TASK-2 ST005
// Testes unitários da lógica de SLA com vi.useFakeTimers
// Rastreabilidade: INT-107

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getSLAStatus, getHoursRemaining, shouldSendReminder } from '../calculate-sla'

const MOCK_NOW = new Date('2026-01-01T12:00:00Z')

describe('getSLAStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(MOCK_NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('retorna HEALTHY quando > 48h restantes', () => {
    const deadline = new Date('2026-01-04T12:00:00Z') // 72h
    expect(getSLAStatus(deadline)).toBe('HEALTHY')
  })

  it('retorna WARNING quando entre 24h e 48h', () => {
    const deadline = new Date('2026-01-02T18:00:00Z') // 30h
    expect(getSLAStatus(deadline)).toBe('WARNING')
  })

  it('retorna CRITICAL quando < 24h restantes', () => {
    const deadline = new Date('2026-01-02T00:00:00Z') // 12h
    expect(getSLAStatus(deadline)).toBe('CRITICAL')
  })

  it('retorna EXPIRED quando deadline já passou', () => {
    const deadline = new Date('2025-12-31T12:00:00Z') // 24h atrás
    expect(getSLAStatus(deadline)).toBe('EXPIRED')
  })

  it('retorna CRITICAL quando deadline é exatamente agora (isPast retorna false)', () => {
    // isPast(t) é false quando t === now — diferença de horas = 0 → CRITICAL
    const deadline = new Date(MOCK_NOW)
    expect(getSLAStatus(deadline)).toBe('CRITICAL')
  })
})

describe('getHoursRemaining', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(MOCK_NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('retorna horas restantes corretas (72h)', () => {
    const deadline = new Date('2026-01-04T12:00:00Z')
    expect(getHoursRemaining(deadline)).toBe(72)
  })

  it('retorna 0 quando deadline passou (nunca negativo)', () => {
    const deadline = new Date('2025-12-31T12:00:00Z')
    expect(getHoursRemaining(deadline)).toBe(0)
  })
})

describe('shouldSendReminder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(MOCK_NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('retorna true com 22h restantes (limite inferior da janela)', () => {
    const deadline = new Date('2026-01-02T10:00:00Z') // 22h
    expect(shouldSendReminder(deadline)).toBe(true)
  })

  it('retorna true com 24h restantes (centro da janela)', () => {
    const deadline = new Date('2026-01-02T12:00:00Z') // 24h
    expect(shouldSendReminder(deadline)).toBe(true)
  })

  it('retorna true com 26h restantes (limite superior da janela)', () => {
    const deadline = new Date('2026-01-02T14:00:00Z') // 26h
    expect(shouldSendReminder(deadline)).toBe(true)
  })

  it('retorna false com 72h restantes (fora da janela)', () => {
    const deadline = new Date('2026-01-04T12:00:00Z') // 72h
    expect(shouldSendReminder(deadline)).toBe(false)
  })

  it('retorna false com 10h restantes (fora da janela)', () => {
    const deadline = new Date('2026-01-01T22:00:00Z') // 10h
    expect(shouldSendReminder(deadline)).toBe(false)
  })

  it('retorna false quando deadline já passou', () => {
    const deadline = new Date('2025-12-31T12:00:00Z')
    expect(shouldSendReminder(deadline)).toBe(false)
  })
})
