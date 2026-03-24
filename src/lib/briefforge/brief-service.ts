import { prisma } from '@/lib/db'
import { BriefStatus } from '@/types/briefforge'
import type { Brief } from '@/types/briefforge'
import type { Prisma } from '@prisma/client'

// ─── ERRORS ───────────────────────────────────────────────────────────────────

export class BriefNotFoundError extends Error {
  readonly statusCode = 404
  readonly code = 'BRIEF_080'
  constructor(message = 'Brief não encontrado.') {
    super(message)
    this.name = 'BriefNotFoundError'
  }
}

export class BriefNotCompletedError extends Error {
  readonly statusCode = 422
  readonly code = 'BRIEF_083'
  constructor(message: string) {
    super(message)
    this.name = 'BriefNotCompletedError'
  }
}

// ─── BRIEF SERVICE ────────────────────────────────────────────────────────────

export class BriefService {
  static async create(input: { projectId: string }): Promise<Brief> {
    const brief = await prisma.brief.create({
      data: {
        projectId: input.projectId,
        status: BriefStatus.DRAFT,
      },
    })
    return brief as unknown as Brief
  }

  static async findById(
    id: string,
    options: { includeLastSession?: boolean } = {},
  ): Promise<Brief> {
    const brief = await prisma.brief.findUnique({
      where: { id },
      include: options.includeLastSession
        ? {
            sessions: {
              orderBy: { startedAt: 'desc' },
              take: 1,
              include: { questions: { orderBy: { order: 'asc' } } },
            },
          }
        : undefined,
    })

    if (!brief) throw new BriefNotFoundError()
    return brief as unknown as Brief
  }

  static async findByProjectId(
    projectId: string,
    options: { includeLastSession?: boolean } = {},
  ): Promise<Brief | null> {
    const brief = await prisma.brief.findUnique({
      where: { projectId },
      include: options.includeLastSession
        ? {
            sessions: {
              orderBy: { startedAt: 'desc' },
              take: 1,
              include: { questions: { orderBy: { order: 'asc' } } },
            },
          }
        : undefined,
    })

    return brief as unknown as Brief | null
  }

  static async update(
    id: string,
    data: { aiMetadata?: Record<string, unknown>; status?: BriefStatus },
  ): Promise<Brief> {
    const brief = await prisma.brief.findUnique({ where: { id } })
    if (!brief) throw new BriefNotFoundError()

    const updated = await prisma.brief.update({
      where: { id },
      data: {
        ...(data.aiMetadata !== undefined
          ? { aiMetadata: data.aiMetadata as Prisma.InputJsonValue }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    })

    return updated as unknown as Brief
  }

  /**
   * Guard para module-6: valida que Brief está COMPLETED antes de gerar PRD.
   * Lança BriefNotCompletedError se brief não existe ou não está COMPLETED.
   */
  static async assertBriefCompleted(briefId: string): Promise<Brief> {
    const brief = await prisma.brief.findUnique({
      where: { id: briefId },
      include: {
        sessions: { orderBy: { startedAt: 'desc' }, take: 1 },
      },
    })

    if (!brief) throw new BriefNotFoundError()
    if (brief.status !== BriefStatus.COMPLETED) {
      throw new BriefNotCompletedError(
        `Brief ${briefId} não está completo: status atual é ${brief.status}`,
      )
    }

    return brief as unknown as Brief
  }
}
