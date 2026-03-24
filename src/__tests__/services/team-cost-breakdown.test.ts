import { TeamCostBreakdown } from '@/lib/services/team-cost-breakdown'
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
    timesheetEntry: {
      findMany: jest.fn(),
    },
  },
}))

describe('TeamCostBreakdown', () => {
  const projectId = 'test-project-uuid'
  let breakdown: TeamCostBreakdown
  const startDate = new Date('2025-01-01')
  const endDate = new Date('2025-01-31')

  beforeEach(() => {
    breakdown = new TeamCostBreakdown(projectId)
    jest.clearAllMocks()
  })

  describe('calculate()', () => {
    it('should break down costs by member', async () => {
      // 2 membros com roles e horas diferentes
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'e1',
          userId: 'u1',
          hours: 10,
          billable: true,
          workDate: new Date('2025-01-05'),
          user: { id: 'u1', name: 'Dev Alpha', role: 'DEV' },
        },
        {
          id: 'e2',
          userId: 'u2',
          hours: 5,
          billable: true,
          workDate: new Date('2025-01-06'),
          user: { id: 'u2', name: 'PM Beta', role: 'PM' },
        },
      ])

      const result = await breakdown.calculate(startDate, endDate)

      expect(result.byMember).toHaveLength(2)
      // u1: 10h * R$100 = R$1.000; u2: 5h * R$100 = R$500
      expect(result.totalCost).toBeCloseTo(1500, 2)

      const devMember = result.byMember.find((m) => m.userId === 'u1')
      expect(devMember).toBeDefined()
      expect(devMember!.totalCost).toBeCloseTo(1000, 2)
      expect(devMember!.totalHours).toBeCloseTo(10, 2)

      const pmMember = result.byMember.find((m) => m.userId === 'u2')
      expect(pmMember).toBeDefined()
      expect(pmMember!.totalCost).toBeCloseTo(500, 2)
    })

    it('should aggregate by role', async () => {
      // 2 DEV + 1 PM → byRole tem 2 entradas (DEV memberCount=2, PM memberCount=1)
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'e1',
          userId: 'u1',
          hours: 8,
          billable: true,
          workDate: new Date('2025-01-05'),
          user: { id: 'u1', name: 'Dev Alpha', role: 'DEV' },
        },
        {
          id: 'e2',
          userId: 'u2',
          hours: 6,
          billable: true,
          workDate: new Date('2025-01-06'),
          user: { id: 'u2', name: 'Dev Gamma', role: 'DEV' },
        },
        {
          id: 'e3',
          userId: 'u3',
          hours: 4,
          billable: true,
          workDate: new Date('2025-01-07'),
          user: { id: 'u3', name: 'PM Beta', role: 'PM' },
        },
      ])

      const result = await breakdown.calculate(startDate, endDate)

      expect(result.byRole).toHaveLength(2)

      const devRole = result.byRole.find((r) => r.role === 'DEV')
      expect(devRole).toBeDefined()
      expect(devRole!.memberCount).toBe(2)
      expect(devRole!.totalHours).toBeCloseTo(14, 2)

      const pmRole = result.byRole.find((r) => r.role === 'PM')
      expect(pmRole).toBeDefined()
      expect(pmRole!.memberCount).toBe(1)
    })

    it('should calculate percentage of total correctly', async () => {
      // Membro com R$800 de R$1.000 total → pctOfProjectCost=80
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'e1',
          userId: 'u1',
          hours: 8,
          billable: true,
          workDate: new Date('2025-01-05'),
          user: { id: 'u1', name: 'Dev Alpha', role: 'DEV' },
        },
        {
          id: 'e2',
          userId: 'u2',
          hours: 2,
          billable: true,
          workDate: new Date('2025-01-06'),
          user: { id: 'u2', name: 'PM Beta', role: 'PM' },
        },
      ])

      const result = await breakdown.calculate(startDate, endDate)

      // u1: 8h * 100 = 800; u2: 2h * 100 = 200; total = 1000
      const devMember = result.byMember.find((m) => m.userId === 'u1')
      expect(devMember!.pctOfProjectCost).toBeCloseTo(80, 0)

      const pmMember = result.byMember.find((m) => m.userId === 'u2')
      expect(pmMember!.pctOfProjectCost).toBeCloseTo(20, 0)
    })

    it('should handle zero entries', async () => {
      // Nenhuma entrada → byMember=[], byRole=[], totalCost=0
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([])

      const result = await breakdown.calculate(startDate, endDate)

      expect(result.byMember).toEqual([])
      expect(result.byRole).toEqual([])
      expect(result.totalCost).toBe(0)
    })

    it('should separate billable and non-billable hours', async () => {
      // Entradas billable=true e billable=false
      ;(prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'e1',
          userId: 'u1',
          hours: 6,
          billable: true,
          workDate: new Date('2025-01-05'),
          user: { id: 'u1', name: 'Dev Alpha', role: 'DEV' },
        },
        {
          id: 'e2',
          userId: 'u1',
          hours: 4,
          billable: false,
          workDate: new Date('2025-01-06'),
          user: { id: 'u1', name: 'Dev Alpha', role: 'DEV' },
        },
      ])

      const result = await breakdown.calculate(startDate, endDate)

      expect(result.byMember).toHaveLength(1)
      const member = result.byMember[0]
      expect(member.billableHours).toBeCloseTo(6, 2)
      expect(member.nonBillableHours).toBeCloseTo(4, 2)
      expect(member.totalHours).toBeCloseTo(10, 2)
      // Custo apenas das horas billable: 6h * 100 = 600
      expect(member.totalCost).toBeCloseTo(600, 2)
      expect(member.billableCost).toBeCloseTo(600, 2)
    })
  })
})
