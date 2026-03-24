/**
 * Teste de integração: fluxo completo de P&L
 *
 * Pré-condições: banco de teste configurado, usuário SOCIO autenticado
 * Sequência:
 *   1. Criar projeto de teste com estimate
 *   2. Configurar CostConfig para role DEV
 *   3. Log de horas billable via timesheet
 *   4. Gerar ProfitReport via PLCalculator
 *   5. Verificar margin = revenue - (hours × rate)
 *
 * Nota: este teste usa PLCalculator diretamente (sem HTTP) para isolar
 * a lógica de cálculo do middleware de autenticação.
 */

import { PLCalculator } from '@/lib/services/pl-calculator'
import { BurnRateCalculator } from '@/lib/services/burn-rate-calculator'
import { prisma } from '@/lib/db'

// Mock CostResolver com rate fixo de R$100/h
jest.mock('@/lib/services/cost-resolver', () => ({
  CostResolver: jest.fn().mockImplementation(() => ({
    resolve: jest.fn().mockResolvedValue({ rate: 100, source: 'test-mock' }),
  })),
}))

// Mock Prisma com dados controlados
jest.mock('@/lib/db', () => ({
  prisma: {
    timesheetEntry: {
      findMany: jest.fn(),
    },
    estimate: {
      findFirst: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
  },
}))

describe('P&L Full Flow Integration', () => {
  const projectId = 'integration-test-project'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should calculate correct P&L: 10h × R$100/h with R$15.000 estimate', async () => {
    // Setup: 10h billable DEV entries
    ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'entry-1',
        userId: 'dev-user-1',
        hours: 10,
        billable: true,
        workDate: new Date('2026-02-15'),
        user: { id: 'dev-user-1', name: 'Test DEV', role: 'DEV' },
      },
    ])

    // Setup: estimate R$15.000
    ;(prisma.estimate.findFirst as jest.Mock).mockResolvedValue({
      totalMin: 10000,
      totalMax: 15000,
      status: 'READY',
    })

    const calculator = new PLCalculator(projectId)
    const result = await calculator.calculate('FULL')

    // Revenue = Estimate.totalMax = 15000
    // Cost = 10h × R$100/h = R$1.000
    // Margin = 15000 - 1000 = 14000
    // MarginPct = (14000/15000) × 100 = 93.33%
    expect(result.revenue).toBe(15000)
    expect(result.cost).toBeCloseTo(1000, 0)
    expect(result.margin).toBeCloseTo(14000, 0)
    expect(result.marginPct).toBeCloseTo(93.33, 1)
    expect(result.hoursLogged).toBe(10)
    expect(result.billableHours).toBe(10)
    expect(result.hasEstimate).toBe(true)
  })

  it('should include teamCosts breakdown', async () => {
    ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'e1',
        userId: 'dev-1',
        hours: 8,
        billable: true,
        workDate: new Date('2026-02-10'),
        user: { id: 'dev-1', name: 'Dev A', role: 'DEV' },
      },
      {
        id: 'e2',
        userId: 'pm-1',
        hours: 2,
        billable: true,
        workDate: new Date('2026-02-10'),
        user: { id: 'pm-1', name: 'PM A', role: 'PM' },
      },
    ])
    ;(prisma.estimate.findFirst as jest.Mock).mockResolvedValue({
      totalMin: 5000,
      totalMax: 10000,
      status: 'READY',
    })

    const calculator = new PLCalculator(projectId)
    const result = await calculator.calculate('FULL')

    // Total cost = (8h + 2h) × R$100 = R$1.000
    expect(result.teamCosts).toHaveLength(2)
    expect(result.cost).toBeCloseTo(1000, 0)

    const devEntry = result.teamCosts.find((t) => t.role === 'DEV')
    const pmEntry = result.teamCosts.find((t) => t.role === 'PM')

    expect(devEntry?.cost).toBeCloseTo(800, 0)
    expect(devEntry?.pctOfTotal).toBeCloseTo(80, 0)
    expect(pmEntry?.cost).toBeCloseTo(200, 0)
    expect(pmEntry?.pctOfTotal).toBeCloseTo(20, 0)
  })

  it('should calculate burn rate projections', async () => {
    const projectCreatedAt = new Date('2026-01-01')

    ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
      createdAt: projectCreatedAt,
      totalHours: 100,
      hourlyRate: 100,
    })

    const burnCalculator = new BurnRateCalculator(projectId)
    const result = await burnCalculator.calculate(5000, 15000)

    expect(result.daysElapsed).toBeGreaterThan(0)
    expect(result.costPerDay).toBeGreaterThan(0)
    expect(typeof result.isOverBudget).toBe('boolean')
    expect(Number.isFinite(result.projectedTotalCost)).toBe(true)
    expect(Number.isFinite(result.projectedMarginPct)).toBe(true)
  })

  it('should handle zero entries gracefully', async () => {
    ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.estimate.findFirst as jest.Mock).mockResolvedValue({
      totalMin: 5000,
      totalMax: 10000,
      status: 'READY',
    })

    const calculator = new PLCalculator(projectId)
    const result = await calculator.calculate('FULL')

    expect(result.cost).toBe(0)
    expect(result.margin).toBe(10000)
    expect(result.hoursLogged).toBe(0)
    expect(result.billableRatio).toBe(0)
    expect(result.teamCosts).toHaveLength(0)
  })
})
