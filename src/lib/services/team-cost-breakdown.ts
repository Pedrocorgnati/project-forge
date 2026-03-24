import { prisma } from '@/lib/db'
import { CostResolver } from '@/lib/services/cost-resolver'
import type {
  MemberBreakdown,
  RoleBreakdown,
  TeamBreakdownResult,
} from '@/types/profitability'

export class TeamCostBreakdown {
  private resolver: CostResolver

  constructor(private projectId: string) {
    this.resolver = new CostResolver(projectId)
  }

  async calculate(
    startDate: Date,
    endDate: Date,
  ): Promise<TeamBreakdownResult> {
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

    const memberMap = new Map<
      string,
      {
        user: { id: string; name: string; role: string }
        totalHours: number
        billableHours: number
        billableCost: number
        totalCost: number
        rate: number
        rateSource: string
      }
    >()

    for (const entry of entries) {
      const resolved = await this.resolver.resolve(
        entry.userId,
        entry.user.role,
      )
      const entryCost = entry.billable
        ? Number(entry.hours) * resolved.rate
        : 0

      const existing = memberMap.get(entry.userId) ?? {
        user: entry.user,
        totalHours: 0,
        billableHours: 0,
        billableCost: 0,
        totalCost: 0,
        rate: resolved.rate,
        rateSource: resolved.source,
      }

      memberMap.set(entry.userId, {
        ...existing,
        totalHours: existing.totalHours + Number(entry.hours),
        billableHours:
          existing.billableHours +
          (entry.billable ? Number(entry.hours) : 0),
        billableCost: existing.billableCost + entryCost,
        totalCost: existing.totalCost + entryCost,
      })
    }

    const totalCost = Array.from(memberMap.values()).reduce(
      (sum, m) => sum + m.totalCost,
      0,
    )

    const byMember: MemberBreakdown[] = Array.from(memberMap.values())
      .map((m) => ({
        userId: m.user.id,
        userName: m.user.name,
        role: m.user.role,
        totalHours: parseFloat(m.totalHours.toFixed(2)),
        billableHours: parseFloat(m.billableHours.toFixed(2)),
        nonBillableHours: parseFloat(
          (m.totalHours - m.billableHours).toFixed(2),
        ),
        effectiveRate: m.rate,
        rateSource: m.rateSource,
        totalCost: parseFloat(m.totalCost.toFixed(2)),
        billableCost: parseFloat(m.billableCost.toFixed(2)),
        pctOfProjectCost:
          totalCost > 0
            ? parseFloat(((m.totalCost / totalCost) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)

    // Agrupar por role
    const roleMap = new Map<string, RoleBreakdown>()
    for (const member of byMember) {
      const existing = roleMap.get(member.role) ?? {
        role: member.role,
        memberCount: 0,
        totalHours: 0,
        totalCost: 0,
        pctOfProjectCost: 0,
        members: [],
      }
      const newTotalCost = existing.totalCost + member.totalCost
      roleMap.set(member.role, {
        ...existing,
        memberCount: existing.memberCount + 1,
        totalHours: existing.totalHours + member.totalHours,
        totalCost: newTotalCost,
        pctOfProjectCost:
          totalCost > 0 ? (newTotalCost / totalCost) * 100 : 0,
        members: [...existing.members, member],
      })
    }

    return {
      byMember,
      byRole: Array.from(roleMap.values()).sort(
        (a, b) => b.totalCost - a.totalCost,
      ),
      totalCost,
    }
  }
}
