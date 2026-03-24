import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { checkAntiFatigue, isQuietHoursNow } from '../anti-fatigue'

// ─── MOCK DO PRISMA ───────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    notification: {
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

const mockCount = vi.mocked(prisma.notification.count)

// ─── MOCK DAS CONSTANTES ──────────────────────────────────────────────────────

vi.mock('@/lib/constants/notifications', () => ({
  NOTIFICATION_LIMITS: {
    MAX_PER_DAY: 10,
    MAX_PER_TYPE_PER_5MIN: 3,
    COOLDOWN_MS: 5 * 60 * 1000,
    QUIET_HOURS_START: 22,
    QUIET_HOURS_END: 8,
  },
}))

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('checkAntiFatigue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('permite primeira notificação do tipo', async () => {
    mockCount.mockResolvedValue(0) // primeira chamada = por tipo, segunda = diária
    const result = await checkAntiFatigue('user-1', 'BRIEF_PRD_APPROVED' as never)
    expect(result).toBe(true)
  })

  it('permite segunda notificação do mesmo tipo em 5min (dentro do limite)', async () => {
    mockCount
      .mockResolvedValueOnce(2) // 2 do mesmo tipo → ainda dentro do limite (max=3)
      .mockResolvedValueOnce(2) // 2 no dia
    const result = await checkAntiFatigue('user-1', 'BRIEF_PRD_APPROVED' as never)
    expect(result).toBe(true)
  })

  it('bloqueia após MAX_PER_TYPE_PER_5MIN notificações do mesmo tipo', async () => {
    mockCount
      .mockResolvedValueOnce(3) // 3 do mesmo tipo → bloqueado (max=3)
    const result = await checkAntiFatigue('user-1', 'BRIEF_PRD_APPROVED' as never)
    expect(result).toBe(false)
  })

  it('bloqueia após MAX_PER_DAY notificações no dia', async () => {
    mockCount
      .mockResolvedValueOnce(0) // por tipo: ok
      .mockResolvedValueOnce(10) // diária: bloqueado (max=10)
    const result = await checkAntiFatigue('user-1', 'ESTIMATE_CREATED' as never)
    expect(result).toBe(false)
  })

  it('tipos diferentes não interferem entre si', async () => {
    mockCount
      .mockResolvedValueOnce(0) // tipo B: zero em 5min → ok
      .mockResolvedValueOnce(3) // diário: 3 (ainda dentro do limite)
    const result = await checkAntiFatigue('user-1', 'ESTIMATE_APPROVED' as never)
    expect(result).toBe(true)
  })

  it('verifica com o userId correto na query', async () => {
    mockCount.mockResolvedValue(0)
    await checkAntiFatigue('user-xyz', 'PROJECT_CREATED' as never)
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-xyz' }) }),
    )
  })
})

describe('isQuietHoursNow', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('retorna true às 23h (dentro de quiet hours 22h–8h)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T23:00:00'))
    expect(isQuietHoursNow()).toBe(true)
  })

  it('retorna true às 6h (dentro de quiet hours 22h–8h)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T06:00:00'))
    expect(isQuietHoursNow()).toBe(true)
  })

  it('retorna false às 9h (fora de quiet hours)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T09:00:00'))
    expect(isQuietHoursNow()).toBe(false)
  })

  it('retorna false ao meio-dia (fora de quiet hours)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T12:00:00'))
    expect(isQuietHoursNow()).toBe(false)
  })
})
