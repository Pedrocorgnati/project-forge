// ─── IMPACT CALCULATOR ────────────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-3 (ST001 + ST002)
// Calcula o impacto acumulado de todas as COs aprovadas em um projeto.
// Rastreabilidade: INT-075

import { prisma } from '@/lib/db'

export interface ProjectImpact {
  totalApprovedCOs: number
  totalImpactHours: number
  totalImpactCost: number
  pendingCOs: number
  rejectedCOs: number
  approvedCOIds: string[]
}

export class ImpactCalculator {
  /**
   * Calcula o impacto acumulado de todas as COs aprovadas em um projeto.
   * Inclui contagens de COs pendentes e rejeitadas para o summary.
   */
  async calculateProjectImpact(projectId: string): Promise<ProjectImpact> {
    // Note: PENDING_APPROVAL adicionado via migration — cast até `prisma generate`
    const [approved, pendingCount, rejectedCount] = await Promise.all([
      prisma.changeOrder.findMany({
        where: { projectId, status: 'APPROVED' },
        select: { id: true, hoursImpact: true, costImpact: true },
      }),
      prisma.changeOrder.count({ where: { projectId, status: 'PENDING_APPROVAL' as any } }),
      prisma.changeOrder.count({ where: { projectId, status: 'REJECTED' } }),
    ])

    const totalImpactHours = approved.reduce((sum: number, co: { hoursImpact: unknown; costImpact: unknown; id: string }) => sum + Number(co.hoursImpact), 0)
    const totalImpactCost = approved.reduce((sum: number, co: { hoursImpact: unknown; costImpact: unknown; id: string }) => sum + Number(co.costImpact), 0)

    return {
      totalApprovedCOs: approved.length,
      totalImpactHours,
      totalImpactCost,
      pendingCOs: pendingCount,
      rejectedCOs: rejectedCount,
      approvedCOIds: approved.map((co: { hoursImpact: unknown; costImpact: unknown; id: string }) => co.id),
    }
  }

  /**
   * Aplica o impacto de COs aprovadas ao totalHours do projeto.
   * Idempotente via recompute: totalHours = baseHours + sum(hoursImpact de APPROVED COs)
   */
  async applyApprovedImpact(projectId: string): Promise<void> {
    // Note: baseHours/totalHours adicionados via migration — cast até `prisma generate`
    const [project, approvedCOs] = await Promise.all([
      (prisma.project.findUnique as any)({
        where: { id: projectId },
        select: { baseHours: true },
      }),
      prisma.changeOrder.findMany({
        where: { projectId, status: 'APPROVED' },
        select: { hoursImpact: true },
      }),
    ])

    const baseHours = Number((project as any)?.baseHours ?? 0)
    const totalCOHours = approvedCOs.reduce((sum: number, co: { hoursImpact: unknown }) => sum + Number(co.hoursImpact), 0)

    await (prisma.project.update as any)({
      where: { id: projectId },
      data: { totalHours: baseHours + totalCOHours },
    })
  }
}
