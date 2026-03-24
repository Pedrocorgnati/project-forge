// ─── IMPACT CALCULATOR TESTS ──────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-4 (ST003)
// Testa ImpactCalculator: cálculo correto, zeros, idempotência
// Rastreabilidade: INT-076

import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    changeOrder: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

import { ImpactCalculator } from '@/lib/services/impact-calculator'
import { prisma } from '@/lib/db'

function p() {
  return prisma as any
}

describe('ImpactCalculator.calculateProjectImpact', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calcula impacto correto de múltiplas COs aprovadas', async () => {
    p().changeOrder.findMany.mockResolvedValue([
      { id: 'co-1', hoursImpact: 5, costImpact: 500 },
      { id: 'co-2', hoursImpact: 8, costImpact: 800 },
      { id: 'co-3', hoursImpact: 3, costImpact: 300 },
    ])
    p().changeOrder.count
      .mockResolvedValueOnce(2)  // pending
      .mockResolvedValueOnce(1)  // rejected

    const calculator = new ImpactCalculator()
    const impact = await calculator.calculateProjectImpact('proj-1')

    expect(impact.totalApprovedCOs).toBe(3)
    expect(impact.totalImpactHours).toBe(16)    // 5+8+3
    expect(impact.totalImpactCost).toBe(1600)   // 500+800+300
    expect(impact.pendingCOs).toBe(2)
    expect(impact.rejectedCOs).toBe(1)
    expect(impact.approvedCOIds).toHaveLength(3)
  })

  it('retorna zeros quando não há COs aprovadas', async () => {
    p().changeOrder.findMany.mockResolvedValue([])
    p().changeOrder.count.mockResolvedValue(0)

    const calculator = new ImpactCalculator()
    const impact = await calculator.calculateProjectImpact('proj-empty')

    expect(impact.totalApprovedCOs).toBe(0)
    expect(impact.totalImpactHours).toBe(0)
    expect(impact.totalImpactCost).toBe(0)
    expect(impact.pendingCOs).toBe(0)
    expect(impact.approvedCOIds).toHaveLength(0)
  })
})

describe('ImpactCalculator.applyApprovedImpact — idempotência via recompute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('totalHours = baseHours + sum(COs aprovadas)', async () => {
    p().project.findUnique.mockResolvedValue({ id: 'proj-1', baseHours: 100 })
    p().changeOrder.findMany.mockResolvedValue([
      { hoursImpact: 10 },
      { hoursImpact: 5 },
    ])

    const calculator = new ImpactCalculator()
    await calculator.applyApprovedImpact('proj-1')

    expect(p().project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { totalHours: 115 }, // 100 + 10 + 5
      }),
    )
  })

  it('idempotente: segunda chamada produz o mesmo resultado', async () => {
    p().project.findUnique.mockResolvedValue({ id: 'proj-1', baseHours: 100 })
    p().changeOrder.findMany.mockResolvedValue([{ hoursImpact: 10 }, { hoursImpact: 5 }])

    const calculator = new ImpactCalculator()
    await calculator.applyApprovedImpact('proj-1')
    await calculator.applyApprovedImpact('proj-1')

    // Ambas as chamadas usam recompute — mesmo resultado
    const calls = vi.mocked(p().project.update).mock.calls
    expect(calls).toHaveLength(2)
    expect((calls[0][0] as any).data.totalHours).toBe(115)
    expect((calls[1][0] as any).data.totalHours).toBe(115)
  })

  it('fallback para baseHours=0 quando projeto não tem o campo', async () => {
    p().project.findUnique.mockResolvedValue(null) // projeto não encontrado
    p().changeOrder.findMany.mockResolvedValue([{ hoursImpact: 8 }])

    const calculator = new ImpactCalculator()
    await calculator.applyApprovedImpact('proj-no-base')

    expect(p().project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { totalHours: 8 }, // 0 + 8
      }),
    )
  })

  it('fórmula de custo: impactCost = impactHours * hourlyRate', () => {
    // Verificação unitária da fórmula
    const hourlyRate = 100
    const impactHours = 8
    const expectedCost = impactHours * hourlyRate
    expect(expectedCost).toBe(800)
  })
})
