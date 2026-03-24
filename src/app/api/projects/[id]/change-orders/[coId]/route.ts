// ─── CHANGE ORDER DETAIL ROUTE ────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-1 (ST005)
// GET   /api/projects/[id]/change-orders/[coId] — detalhe individual
// PATCH /api/projects/[id]/change-orders/[coId] — editar CO em DRAFT
// Rastreabilidade: INT-072, INT-073

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { UpdateChangeOrderSchema } from '@/lib/schemas/change-order'
import { ERROR_CODES } from '@/lib/constants/errors'
import { UserRole } from '@prisma/client'
import { mapCO } from '@/lib/utils/change-order'
import { AppError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/change-order')

type Params = { id: string; coId: string }

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id: projectId, coId } = await params
  const user = await getServerUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.AUTH_001.code, message: ERROR_CODES.AUTH_001.message } },
      { status: 401 },
    )
  }

  try {
    await withProjectAccess(user.id, projectId)

    const co = await prisma.changeOrder.findUnique({
      where: { id: coId },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        tasks: { select: { taskId: true } },
      },
    })

    if (!co || co.projectId !== projectId) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.CO_080.code, message: ERROR_CODES.CO_080.message } },
        { status: 404 },
      )
    }

    // CLIENTE: apenas COs APPROVED
    if (user.role === UserRole.CLIENTE && co.status !== 'APPROVED') {
      return NextResponse.json(
        { error: { code: ERROR_CODES.AUTH_003.code, message: 'Acesso negado.' } },
        { status: 403 },
      )
    }

    const mapped = mapCO(co)

    // DEV: ocultar campos financeiros
    if (user.role === UserRole.DEV) {
      const { impactHours: _h, impactCost: _c, hoursImpact: _hi, costImpact: _ci, ...rest } = mapped as any
      return NextResponse.json(rest)
    }

    return NextResponse.json(mapped)
  } catch (error: unknown) {
    if (error instanceof AppError && error.statusCode === 403) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.AUTH_003.code, message: ERROR_CODES.AUTH_003.message } },
        { status: 403 },
      )
    }
    log.error({ err: error }, '[GET /change-orders/[coId]]')
    return NextResponse.json(
      { error: { code: ERROR_CODES.SYS_001.code, message: ERROR_CODES.SYS_001.message } },
      { status: 500 },
    )
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id: projectId, coId } = await params
  const user = await getServerUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.AUTH_001.code, message: ERROR_CODES.AUTH_001.message } },
      { status: 401 },
    )
  }

  if (!([UserRole.PM, UserRole.SOCIO] as string[]).includes(user.role)) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.CO_001.code, message: 'Apenas PM ou Sócio podem editar Change Orders.' } },
      { status: 403 },
    )
  }

  try {
    await withProjectAccess(user.id, projectId)

    const co = await prisma.changeOrder.findUnique({
      where: { id: coId },
      select: { id: true, projectId: true, status: true, createdBy: true, hoursImpact: true },
    })

    if (!co || co.projectId !== projectId) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.CO_080.code, message: ERROR_CODES.CO_080.message } },
        { status: 404 },
      )
    }

    if (co.status !== 'DRAFT') {
      return NextResponse.json(
        { error: { code: ERROR_CODES.CO_050.code, message: 'Apenas COs em DRAFT podem ser editadas.' } },
        { status: 409 },
      )
    }

    if (co.createdBy !== user.id) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.CO_001.code, message: 'Apenas o criador pode editar a Change Order.' } },
        { status: 403 },
      )
    }

    const body = await req.json()
    const parsed = UpdateChangeOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.CO_020.code, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' } },
        { status: 422 },
      )
    }

    const updateData: any = {}
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description

    if (parsed.data.impactHours !== undefined) {
      updateData.hoursImpact = parsed.data.impactHours
      // Recalcular impactCost se impactHours mudou
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { hourlyRate: true } as any,
      }) as any
      updateData.costImpact = parsed.data.impactHours * Number(project?.hourlyRate ?? 0)
    }

    // Atualizar tasks afetadas se fornecidas
    if (parsed.data.affectedTaskIds !== undefined) {
      // Verificar que todas as taskIds pertencem ao projeto (GAP-014)
      if (parsed.data.affectedTaskIds.length > 0) {
        const tasks = await prisma.task.findMany({
          where: { id: { in: parsed.data.affectedTaskIds }, projectId },
          select: { id: true },
        })
        if (tasks.length !== parsed.data.affectedTaskIds.length) {
          return NextResponse.json(
            { error: { code: ERROR_CODES.CO_020.code, message: 'Uma ou mais tasks não pertencem a este projeto.' } },
            { status: 422 },
          )
        }
      }

      // Deletar antigas e inserir novas via ChangeOrderTask
      await prisma.changeOrderTask.deleteMany({ where: { changeOrderId: coId } })
      if (parsed.data.affectedTaskIds.length > 0) {
        await prisma.changeOrderTask.createMany({
          data: parsed.data.affectedTaskIds.map((taskId) => ({ changeOrderId: coId, taskId })),
        })
      }
    }

    const updated = await prisma.changeOrder.update({
      where: { id: coId },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, role: true } },
        tasks: { select: { taskId: true } },
      },
    })

    return NextResponse.json(mapCO(updated))
  } catch (error: unknown) {
    if (error instanceof AppError && error.statusCode === 403) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.AUTH_003.code, message: ERROR_CODES.AUTH_003.message } },
        { status: 403 },
      )
    }
    log.error({ err: error }, '[PATCH /change-orders/[coId]]')
    return NextResponse.json(
      { error: { code: ERROR_CODES.SYS_001.code, message: ERROR_CODES.SYS_001.message } },
      { status: 500 },
    )
  }
}
