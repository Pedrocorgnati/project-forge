import { BurnRateCalculator } from '@/lib/services/burn-rate-calculator'
import { prisma } from '@/lib/db'

// Mock CostResolver para testes determinísticos
jest.mock('@/lib/services/cost-resolver', () => ({
  CostResolver: jest.fn().mockImplementation(() => ({
    resolve: jest.fn().mockResolvedValue({ rate: 100, source: 'test-mock' }),
  })),
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
    timesheetEntry: {
      findMany: jest.fn(),
    },
    estimate: {
      findFirst: jest.fn(),
    },
  },
}))

describe('BurnRateCalculator', () => {
  const projectId = 'test-project-uuid'
  let calculator: BurnRateCalculator

  beforeEach(() => {
    calculator = new BurnRateCalculator(projectId)
    jest.clearAllMocks()
  })

  describe('calculate()', () => {
    it('should calculate correct burn rate for active project', async () => {
      // Projeto iniciado há 10 dias, R$5.000 custo, R$15.000 receita
      const tenDaysAgo = new Date()
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
        createdAt: tenDaysAgo,
        totalHours: null,
        hourlyRate: null,
      })

      const result = await calculator.calculate(5000, 15000)

      expect(result.costPerDay).toBeCloseTo(500, 0)
      expect(result.isOverBudget).toBe(false)
      expect(result.daysElapsed).toBe(10)
      expect(result.projectedMargin).toBeCloseTo(10000, 0)
    })

    it('should detect over-budget projection', async () => {
      // Projeto iniciado há 5 dias, R$8.000 custo, R$10.000 receita
      // totalHours definido para forçar projeção que excede receita
      const fiveDaysAgo = new Date()
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
        createdAt: fiveDaysAgo,
        totalHours: 200,
        hourlyRate: 100,
      })

      const result = await calculator.calculate(8000, 10000)

      expect(result.isOverBudget).toBe(true)
    })

    it('should handle zero cost gracefully', async () => {
      // R$0 custo → costPerDay=0, isOverBudget=false
      const fiveDaysAgo = new Date()
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
        createdAt: fiveDaysAgo,
        totalHours: null,
        hourlyRate: null,
      })

      const result = await calculator.calculate(0, 5000)

      expect(result.costPerDay).toBe(0)
      expect(result.isOverBudget).toBe(false)
      expect(result.projectedTotalCost).toBe(0)
    })

    it('should project remaining days when totalHours defined', async () => {
      // Projeto com totalHours definido → daysRemaining é número positivo
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
        createdAt: threeDaysAgo,
        totalHours: 100,
        hourlyRate: 50,
      })

      // 3000 custo / 50 rate = 60h consumidas em 3 dias = 20h/dia
      // remaining = 100 - 60 = 40h → 40/20 = 2 dias
      const result = await calculator.calculate(3000, 10000)

      expect(result.daysRemaining).not.toBeNull()
      expect(result.daysRemaining!).toBeGreaterThan(0)
    })

    it('should throw error when project not found', async () => {
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(calculator.calculate(1000, 5000)).rejects.toThrow(
        `Projeto ${projectId} não encontrado`,
      )
    })
  })

  describe('getCumulativeCostTimeline()', () => {
    it('should return sorted cumulative cost points', async () => {
      // 3 entradas em datas diferentes → 3 pontos com custo cumulativo ascendente
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'e1',
          userId: 'u1',
          hours: 2,
          billable: true,
          workDate: new Date('2025-01-01'),
          user: { id: 'u1', role: 'DEV' },
        },
        {
          id: 'e2',
          userId: 'u1',
          hours: 3,
          billable: true,
          workDate: new Date('2025-01-02'),
          user: { id: 'u1', role: 'DEV' },
        },
        {
          id: 'e3',
          userId: 'u1',
          hours: 5,
          billable: true,
          workDate: new Date('2025-01-03'),
          user: { id: 'u1', role: 'DEV' },
        },
      ])
      ;(prisma.estimate.findFirst as jest.Mock).mockResolvedValue({
        totalMax: 5000,
        status: 'READY',
      })

      const result = await calculator.getCumulativeCostTimeline()

      expect(result).toHaveLength(3)
      // 2h * 100 = 200, 3h * 100 = 300, 5h * 100 = 500
      expect(result[0].cumulativeCost).toBeCloseTo(200, 2)
      expect(result[1].cumulativeCost).toBeCloseTo(500, 2)
      expect(result[2].cumulativeCost).toBeCloseTo(1000, 2)
      expect(result[0].budget).toBe(5000)
      // Verificar ordenação
      expect(result[0].date < result[1].date).toBe(true)
      expect(result[1].date < result[2].date).toBe(true)
    })

    it('should return empty array for no entries', async () => {
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.estimate.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await calculator.getCumulativeCostTimeline()

      expect(result).toEqual([])
    })
  })
})
