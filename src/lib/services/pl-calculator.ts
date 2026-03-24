import { prisma } from '@/lib/db'
import { CostResolver } from '@/lib/services/cost-resolver'
import type { PeriodType } from '@prisma/client'
import type { PLResult, TeamMemberCost } from '@/types/profitability'

export class PLCalculator {
  private resolver: CostResolver

  constructor(private projectId: string) {
    this.resolver = new CostResolver(projectId)
  }

  async calculate(period: PeriodType): Promise<PLResult> {
    const { startDate, endDate } = this.getPeriodBounds(period)

    const entries = await prisma.timesheetEntry.findMany({
      where: {
        projectId: this.projectId,
        workDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    })

    const estimate = await prisma.estimate.findFirst({
      where: { projectId: this.projectId, status: 'READY' },
      orderBy: { createdAt: 'desc' },
    })

    const revenue = estimate ? Number(estimate.totalMax) : 0
    const revenueMid = estimate
      ? (Number(estimate.totalMin) + Number(estimate.totalMax)) / 2
      : 0

    const userMap = new Map<
      string,
      {
        user: { id: string; name: string; role: string }
        hours: number
        billableHours: number
        cost: number
        rate: number
        rateSource: string
      }
    >()

    for (const entry of entries) {
      const resolved = await this.resolver.resolve(entry.userId, entry.user.role)
      const cost = entry.billable ? Number(entry.hours) * resolved.rate : 0

      const existing = userMap.get(entry.userId) ?? {
        user: entry.user,
        hours: 0,
        billableHours: 0,
        cost: 0,
        rate: resolved.rate,
        rateSource: resolved.source,
      }

      userMap.set(entry.userId, {
        user: entry.user,
        hours: existing.hours + Number(entry.hours),
        billableHours:
          existing.billableHours + (entry.billable ? Number(entry.hours) : 0),
        cost: existing.cost + cost,
        rate: resolved.rate,
        rateSource: resolved.source,
      })
    }

    const totalCost = Array.from(userMap.values()).reduce(
      (sum, u) => sum + u.cost,
      0,
    )
    const hoursLogged = entries.reduce(
      (sum: number, e: { hours: unknown; billable: boolean }) => sum + Number(e.hours),
      0,
    )
    const billableHours = entries
      .filter((e: { hours: unknown; billable: boolean }) => e.billable)
      .reduce((sum: number, e: { hours: unknown; billable: boolean }) => sum + Number(e.hours), 0)

    const teamCosts: TeamMemberCost[] = Array.from(userMap.values()).map(
      ({ user, hours, billableHours: bh, cost, rate, rateSource }) => ({
        userId: user.id,
        userName: user.name,
        role: user.role,
        hours,
        billableHours: bh,
        effectiveRate: rate,
        rateSource,
        cost,
        pctOfTotal: totalCost > 0 ? (cost / totalCost) * 100 : 0,
      }),
    )

    const margin = revenue - totalCost
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0

    return {
      period,
      startDate,
      endDate,
      revenue,
      revenueMid,
      cost: totalCost,
      margin,
      marginPct: parseFloat(marginPct.toFixed(2)),
      hoursLogged,
      billableHours,
      nonBillableHours: hoursLogged - billableHours,
      billableRatio: hoursLogged > 0 ? (billableHours / hoursLogged) * 100 : 0,
      teamCosts,
      hasEstimate: !!estimate,
    }
  }

  private getPeriodBounds(period: PeriodType): {
    startDate: Date
    endDate: Date
  } {
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)

    if (period === 'WEEKLY') {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - startDate.getDay() + 1)
      startDate.setHours(0, 0, 0, 0)
      return { startDate, endDate }
    }

    if (period === 'MONTHLY') {
      const startDate = new Date()
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      return { startDate, endDate }
    }

    // FULL: desde o início do projeto
    return {
      startDate: new Date('2000-01-01'),
      endDate,
    }
  }
}
