import { prisma } from '@/lib/db'
import { CostResolver } from '@/lib/services/cost-resolver'
import type { BurnRateResult, CumulativeCostPoint } from '@/types/profitability'

export class BurnRateCalculator {
  constructor(private projectId: string) {}

  async calculate(
    totalCostToDate: number,
    revenue: number,
  ): Promise<BurnRateResult> {
    const project = await prisma.project.findUnique({
      where: { id: this.projectId },
      select: { createdAt: true, totalHours: true, hourlyRate: true },
    })

    if (!project) throw new Error(`Projeto ${this.projectId} não encontrado`)

    const today = new Date()
    const projectStart = project.createdAt
    const daysElapsed = Math.max(
      1,
      Math.floor(
        (today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24),
      ),
    )

    const costPerDay = totalCostToDate / daysElapsed

    let daysRemaining: number | null = null
    let projectedTotalCost = totalCostToDate
    let projectedMargin = revenue - totalCostToDate
    let projectedMarginPct =
      revenue > 0 ? (projectedMargin / revenue) * 100 : 0

    // Projetar com base em totalHours do projeto (se definido)
    const totalProjectHours = Number(project.totalHours)
    if (totalProjectHours > 0 && daysElapsed > 0) {
      const hoursPerDay = totalCostToDate > 0
        ? (totalCostToDate / (Number(project.hourlyRate) || 1)) / daysElapsed
        : 0
      if (hoursPerDay > 0) {
        const remainingHours = Math.max(0, totalProjectHours - (hoursPerDay * daysElapsed))
        daysRemaining = Math.ceil(remainingHours / hoursPerDay)
        projectedTotalCost = totalCostToDate + costPerDay * daysRemaining
        projectedMargin = revenue - projectedTotalCost
        projectedMarginPct =
          revenue > 0 ? (projectedMargin / revenue) * 100 : 0
      }
    }

    return {
      daysElapsed,
      daysRemaining,
      costPerDay: parseFloat(costPerDay.toFixed(2)),
      projectedTotalCost: parseFloat(projectedTotalCost.toFixed(2)),
      projectedMargin: parseFloat(projectedMargin.toFixed(2)),
      projectedMarginPct: parseFloat(projectedMarginPct.toFixed(2)),
      isOverBudget: projectedTotalCost > revenue,
    }
  }

  async getCumulativeCostTimeline(): Promise<CumulativeCostPoint[]> {
    const resolver = new CostResolver(this.projectId)

    const entries = await prisma.timesheetEntry.findMany({
      where: { projectId: this.projectId, billable: true, deletedAt: null },
      orderBy: { workDate: 'asc' },
      include: {
        user: { select: { id: true, role: true } },
      },
    })

    const estimate = await prisma.estimate.findFirst({
      where: { projectId: this.projectId, status: 'READY' },
      orderBy: { createdAt: 'desc' },
    })

    const budget = estimate ? Number(estimate.totalMax) : 0

    // Agrupar por data e calcular custo cumulativo
    const dailyCosts = new Map<string, number>()
    for (const entry of entries) {
      const dateKey = entry.workDate.toISOString().split('T')[0]
      const resolved = await resolver.resolve(entry.userId, entry.user.role)
      const cost = Number(entry.hours) * resolved.rate
      dailyCosts.set(dateKey, (dailyCosts.get(dateKey) ?? 0) + cost)
    }

    let cumulativeCost = 0
    return Array.from(dailyCosts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dailyCost]) => {
        cumulativeCost += dailyCost
        return {
          date,
          cumulativeCost: parseFloat(cumulativeCost.toFixed(2)),
          budget,
        }
      })
  }
}
