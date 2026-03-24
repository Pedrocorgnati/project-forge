import { prisma } from '@/lib/db'

const DEFAULT_HOURLY_RATES: Record<string, number> = {
  SOCIO: 150,
  PM: 120,
  DEV: 100,
  CLIENTE: 0,
}

export type RateSource = 'override' | 'role-config' | 'project-rate' | 'global-default'

export interface ResolvedRate {
  rate: number
  source: RateSource
  configId?: string
  overrideId?: string
}

export class CostResolver {
  constructor(private projectId: string) {}

  async resolve(userId: string, userRole: string): Promise<ResolvedRate> {
    // Nível 1: CostOverride para este usuário (via CostConfig ativa)
    const activeConfig = await prisma.costConfig.findFirst({
      where: {
        projectId: this.projectId,
        role: userRole as never,
        effectiveTo: null,
      },
      orderBy: { effectiveFrom: 'desc' },
      include: {
        overrides: { where: { userId } },
      },
    })

    if (activeConfig?.overrides.length) {
      const override = activeConfig.overrides[0]
      return {
        rate: Number(override.customRate),
        source: 'override',
        configId: activeConfig.id,
        overrideId: override.id,
      }
    }

    // Nível 2: CostConfig para o role no projeto
    if (activeConfig) {
      return {
        rate: Number(activeConfig.hourlyRate),
        source: 'role-config',
        configId: activeConfig.id,
      }
    }

    // Nível 2b: ProjectCostRate (modelo legado simples)
    const projectRate = await prisma.projectCostRate.findUnique({
      where: {
        projectId_role: {
          projectId: this.projectId,
          role: userRole as never,
        },
      },
    })

    if (projectRate) {
      return {
        rate: Number(projectRate.hourlyRate),
        source: 'project-rate',
      }
    }

    // Nível 3: Global default
    const defaultRate = DEFAULT_HOURLY_RATES[userRole] ?? 0
    return { rate: defaultRate, source: 'global-default' }
  }

  async resolveForEntry(
    entry: { userId: string; hours: number; billable: boolean },
    userRole: string,
  ): Promise<{ cost: number; rate: number; source: RateSource }> {
    const resolved = await this.resolve(entry.userId, userRole)
    const cost = entry.billable ? entry.hours * resolved.rate : 0
    return { cost, rate: resolved.rate, source: resolved.source }
  }
}
