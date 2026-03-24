import { PLCalculator } from '@/lib/services/pl-calculator'
import { prisma } from '@/lib/db'

// Mock CostResolver for deterministic tests
jest.mock('@/lib/services/cost-resolver', () => ({
  CostResolver: jest.fn().mockImplementation(() => ({
    resolve: jest.fn().mockResolvedValue({ rate: 100, source: 'global-default' }),
  })),
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    timesheetEntry: {
      findMany: jest.fn(),
    },
    estimate: {
      findFirst: jest.fn(),
    },
  },
}))

describe('PLCalculator', () => {
  const projectId = 'test-project-uuid'
  let calculator: PLCalculator

  beforeEach(() => {
    calculator = new PLCalculator(projectId)
    jest.clearAllMocks()
  })

  describe('calculate(FULL)', () => {
    it('should compute correct margin with known timesheet data', async () => {
      // 10h billable @ R$100/h = R$1.000 custo; Revenue = R$5.000
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'entry-1',
          userId: 'user-1',
          hours: 10,
          billable: true,
          workDate: new Date(),
          user: { id: 'user-1', name: 'Dev 1', role: 'DEV' },
        },
      ])
      ;(prisma.estimate.findFirst as jest.Mock).mockResolvedValue({
        totalMin: 4000,
        totalMax: 5000,
        status: 'READY',
      })

      const result = await calculator.calculate('FULL')

      expect(result.cost).toBeCloseTo(1000, 2)
      expect(result.revenue).toBe(5000)
      expect(result.margin).toBeCloseTo(4000, 2)
      expect(result.marginPct).toBeCloseTo(80, 1)
      expect(result.hasEstimate).toBe(true)
    })

    it('should compute zero cost for non-billable hours', async () => {
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'entry-2',
          userId: 'user-1',
          hours: 8,
          billable: false,
          workDate: new Date(),
          user: { id: 'user-1', name: 'Dev 1', role: 'DEV' },
        },
      ])
      ;(prisma.estimate.findFirst as jest.Mock).mockResolvedValue({
        totalMin: 3000,
        totalMax: 5000,
        status: 'READY',
      })

      const result = await calculator.calculate('FULL')

      expect(result.cost).toBe(0)
      expect(result.margin).toBe(5000)
      expect(result.nonBillableHours).toBe(8)
    })

    it('should return hasEstimate=false when no estimate exists', async () => {
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.estimate.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await calculator.calculate('FULL')

      expect(result.hasEstimate).toBe(false)
      expect(result.revenue).toBe(0)
    })

    it('should aggregate costs for multiple team members', async () => {
      // 2 DEVs com 5h cada @ R$100/h = R$1.000 total
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'e1',
          userId: 'u1',
          hours: 5,
          billable: true,
          workDate: new Date(),
          user: { id: 'u1', name: 'Dev A', role: 'DEV' },
        },
        {
          id: 'e2',
          userId: 'u2',
          hours: 5,
          billable: true,
          workDate: new Date(),
          user: { id: 'u2', name: 'Dev B', role: 'DEV' },
        },
      ])
      ;(prisma.estimate.findFirst as jest.Mock).mockResolvedValue({
        totalMin: 2000,
        totalMax: 4000,
        status: 'READY',
      })

      const result = await calculator.calculate('FULL')

      expect(result.teamCosts).toHaveLength(2)
      expect(result.cost).toBeCloseTo(1000, 2)
      expect(result.teamCosts[0].pctOfTotal).toBeCloseTo(50, 0)
      expect(result.teamCosts[1].pctOfTotal).toBeCloseTo(50, 0)
    })

    it('should compute billableRatio correctly', async () => {
      // 6h billable + 4h non-billable = 60% billable
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'e1',
          userId: 'u1',
          hours: 6,
          billable: true,
          workDate: new Date(),
          user: { id: 'u1', name: 'Dev A', role: 'DEV' },
        },
        {
          id: 'e2',
          userId: 'u1',
          hours: 4,
          billable: false,
          workDate: new Date(),
          user: { id: 'u1', name: 'Dev A', role: 'DEV' },
        },
      ])
      ;(prisma.estimate.findFirst as jest.Mock).mockResolvedValue({
        totalMin: 2000,
        totalMax: 3000,
        status: 'READY',
      })

      const result = await calculator.calculate('FULL')

      expect(result.hoursLogged).toBeCloseTo(10, 1)
      expect(result.billableHours).toBeCloseTo(6, 1)
      expect(result.billableRatio).toBeCloseTo(60, 0)
    })

    it('should return marginPct=0 when revenue is zero (no division by zero)', async () => {
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.estimate.findFirst as jest.Mock).mockResolvedValue({
        totalMin: 0,
        totalMax: 0,
        status: 'READY',
      })

      const result = await calculator.calculate('FULL')

      expect(result.marginPct).toBe(0)
      expect(Number.isFinite(result.marginPct)).toBe(true)
    })
  })
})
