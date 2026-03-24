'use server'

import { prisma } from '@/lib/db'
import { requireServerUser } from '@/lib/auth/get-user'
import { withProjectAccess, hasRole } from '@/lib/rbac'
import { toActionError, AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import { z } from 'zod'
import { CostConfigCreateSchema, CostOverrideCreateSchema } from '@/schemas/cost-config.schema'
import type { CostConfigCreateInput, CostOverrideCreateInput } from '@/schemas/cost-config.schema'
import { EventBus } from '@/lib/events'
import { EventType } from '@/lib/constants/events'
import { CostResolver } from '@/lib/services/cost-resolver'
import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

// ── CREATE COST CONFIG ─────────────────────────────────────────────────────────

export async function createCostConfig(input: CostConfigCreateInput) {
  try {
    const user = await requireServerUser()
    const validated = CostConfigCreateSchema.parse(input)
    await withProjectAccess(user.id, validated.projectId, UserRole.SOCIO)

    // Fechar config anterior para o mesmo role (effectiveTo = agora)
    await prisma.costConfig.updateMany({
      where: {
        projectId: validated.projectId,
        role: validated.role,
        effectiveTo: null,
      },
      data: { effectiveTo: new Date() },
    })

    const config = await prisma.costConfig.create({
      data: {
        projectId: validated.projectId,
        createdById: user.id,
        role: validated.role,
        hourlyRate: validated.hourlyRate,
        effectiveFrom: new Date(validated.effectiveFrom),
      },
    })

    // Publicar evento (best-effort — falha não reverte a config)
    try {
      await EventBus.publish(
        EventType.COST_CONFIG_UPDATED,
        validated.projectId,
        {
          updatedBy: user.id,
          role: validated.role,
          newRate: validated.hourlyRate,
          changes: [`Tarifa ${validated.role} atualizada para ${validated.hourlyRate}`],
        },
        'module-14-rentabilia',
      )
    } catch {
      // EventBus é best-effort
    }

    revalidatePath('/rentabilia')
    return { data: config }
  } catch (error) {
    return toActionError(error)
  }
}

// ── GET EFFECTIVE RATES ────────────────────────────────────────────────────────

export async function getEffectiveRates(projectId: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId)

    // Apenas SOCIO e PM podem ver tarifas
    if (!hasRole(user.role, [UserRole.SOCIO, UserRole.PM])) {
      throw new AppError(ERROR_CODES.AUTH_005.code, ERROR_CODES.AUTH_005.message, 403)
    }

    // Buscar membros do projeto
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, role: true } } },
    })

    const resolver = new CostResolver(projectId)

    const effectiveRates = await Promise.all(
      projectMembers.map(async (member: { userId: string; user: { name: string; role: string } }) => {
        const resolved = await resolver.resolve(member.userId, member.user.role)
        return {
          userId: member.userId,
          userName: member.user.name,
          role: member.user.role,
          effectiveRate: resolved.rate,
          rateSource: resolved.source,
          configId: resolved.configId,
          overrideId: resolved.overrideId,
        }
      }),
    )

    return { data: effectiveRates }
  } catch (error) {
    return toActionError(error)
  }
}

// ── GET COST CONFIGS (raw configs for management) ──────────────────────────────

export async function getCostConfigs(projectId: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId, UserRole.SOCIO)

    const configs = await prisma.costConfig.findMany({
      where: { projectId },
      include: {
        overrides: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
      },
      orderBy: [{ role: 'asc' }, { effectiveFrom: 'desc' }],
    })

    return { data: configs }
  } catch (error) {
    return toActionError(error)
  }
}

// ── CREATE COST OVERRIDE ───────────────────────────────────────────────────────

export async function createCostOverride(input: CostOverrideCreateInput) {
  try {
    const user = await requireServerUser()
    const validated = CostOverrideCreateSchema.parse(input)
    await withProjectAccess(user.id, validated.projectId, UserRole.SOCIO)

    // Verificar que o usuário alvo é membro do projeto
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: validated.projectId,
          userId: validated.userId,
        },
      },
    })
    if (!isMember) {
      throw new AppError(ERROR_CODES.TS_061.code, ERROR_CODES.TS_061.message, 422)
    }

    // Buscar role do usuário alvo
    const targetUser = await prisma.user.findUnique({
      where: { id: validated.userId },
      select: { role: true },
    })
    if (!targetUser) {
      throw new AppError(ERROR_CODES.TS_080.code, 'Usuário não encontrado', 404)
    }

    // Buscar CostConfig vigente para o role do usuário alvo
    const activeConfig = await prisma.costConfig.findFirst({
      where: {
        projectId: validated.projectId,
        role: targetUser.role,
        effectiveTo: null,
      },
      orderBy: { effectiveFrom: 'desc' },
    })

    if (!activeConfig) {
      throw new AppError(
        ERROR_CODES.TS_060.code,
        `Nenhuma configuração de custo ativa para role ${targetUser.role}. Crie primeiro via createCostConfig.`,
        422,
      )
    }

    // Upsert: se já existe override para este user, atualiza; senão cria
    const override = await prisma.costOverride.upsert({
      where: {
        UQ_cost_override_config_user: {
          costConfigId: activeConfig.id,
          userId: validated.userId,
        },
      },
      update: {
        customRate: validated.customRate,
        reason: validated.reason,
      },
      create: {
        costConfigId: activeConfig.id,
        userId: validated.userId,
        customRate: validated.customRate,
        reason: validated.reason,
      },
    })

    // Publicar evento (best-effort)
    try {
      await EventBus.publish(
        EventType.COST_CONFIG_UPDATED,
        validated.projectId,
        {
          updatedBy: user.id,
          role: targetUser.role,
          newRate: validated.customRate,
          changes: [`Override para ${validated.userId}: ${validated.customRate}/h`],
        },
        'module-14-rentabilia',
      )
    } catch {
      // EventBus é best-effort
    }

    revalidatePath('/rentabilia')
    return { data: override }
  } catch (error) {
    return toActionError(error)
  }
}

// ── UPDATE COST CONFIG ────────────────────────────────────────────────────────

const UpdateCostConfigSchema = z.object({
  hourlyRate: z.number().positive('Tarifa deve ser positiva').max(10000).optional(),
  effectiveTo: z.string().datetime({ message: 'Data ISO inválida' }).optional(),
}).refine(
  (v) => v.hourlyRate !== undefined || v.effectiveTo !== undefined,
  { message: 'Pelo menos um campo deve ser fornecido' },
)

export async function updateCostConfig(
  configId: string,
  updates: { hourlyRate?: number; effectiveTo?: string },
) {
  try {
    const user = await requireServerUser()
    const validated = UpdateCostConfigSchema.parse(updates)

    const config = await prisma.costConfig.findUnique({ where: { id: configId } })
    if (!config) {
      throw new AppError(ERROR_CODES.TS_081.code, ERROR_CODES.TS_081.message, 404)
    }

    await withProjectAccess(user.id, config.projectId, UserRole.SOCIO)

    const data: Record<string, unknown> = {}
    if (validated.hourlyRate !== undefined) data.hourlyRate = validated.hourlyRate
    if (validated.effectiveTo !== undefined) data.effectiveTo = new Date(validated.effectiveTo)

    const updated = await prisma.costConfig.update({
      where: { id: configId },
      data,
    })

    // Publicar evento (best-effort)
    try {
      const changes: string[] = []
      if (updates.hourlyRate !== undefined) {
        changes.push(`Tarifa ${config.role} atualizada para ${updates.hourlyRate}`)
      }
      if (updates.effectiveTo !== undefined) {
        changes.push(`Vigência encerrada em ${updates.effectiveTo}`)
      }
      await EventBus.publish(
        EventType.COST_CONFIG_UPDATED,
        config.projectId,
        {
          updatedBy: user.id,
          role: config.role,
          newRate: updates.hourlyRate ?? Number(config.hourlyRate),
          changes,
        },
        'module-14-rentabilia',
      )
    } catch {
      // EventBus é best-effort
    }

    revalidatePath('/rentabilia')
    return { data: updated }
  } catch (error) {
    return toActionError(error)
  }
}

// ── RESOLVE RATE (utility for other modules) ───────────────────────────────────

export async function resolveRate(projectId: string, userId: string) {
  try {
    const user = await requireServerUser()
    await withProjectAccess(user.id, projectId)

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    if (!targetUser) {
      throw new AppError(ERROR_CODES.TS_080.code, 'Usuário não encontrado', 404)
    }

    const resolver = new CostResolver(projectId)
    const resolved = await resolver.resolve(userId, targetUser.role)

    return { data: resolved }
  } catch (error) {
    return toActionError(error)
  }
}
