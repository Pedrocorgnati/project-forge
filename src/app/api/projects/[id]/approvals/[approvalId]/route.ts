// src/app/api/projects/[id]/approvals/[approvalId]/route.ts
// module-17-clientportal-approvals / TASK-1 ST003
// GET   /api/projects/[id]/approvals/[approvalId] — Detalhe com histórico
// PATCH /api/projects/[id]/approvals/[approvalId] — Cancelar (SOCIO, PM)
// Rastreabilidade: INT-105

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { ERROR_CODES } from '@/lib/constants/errors'
import { logApprovalHistory } from '@/lib/approvals/log-history'
import { UserRole } from '@prisma/client'

type RouteParams = { params: Promise<{ id: string; approvalId: string }> }

// ─── GET — detalhe da aprovação ───────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id: projectId, approvalId } = await params
  const user = await getServerUser()

  if (!user) return NextResponse.json(ERROR_CODES.AUTH_001, { status: 401 })

  const approval = await prisma.approvalRequest.findUnique({
    where: { id: approvalId, projectId },
    include: {
      requester: { select: { name: true, email: true } },
      clientAccess: { select: { clientEmail: true, clientName: true } },
      history: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!approval) {
    return NextResponse.json(
      { code: 'APPROVAL_080', message: 'Aprovação não encontrada.' },
      { status: 404 },
    )
  }

  // CLIENTE só vê a própria aprovação
  if (user.role === UserRole.CLIENTE) {
    if (approval.clientAccess.clientEmail !== user.email) {
      return NextResponse.json(ERROR_CODES.AUTH_001, { status: 403 })
    }
    return NextResponse.json(approval)
  }

  if (user.role !== UserRole.SOCIO && user.role !== UserRole.PM) {
    return NextResponse.json(ERROR_CODES.AUTH_001, { status: 403 })
  }

  try {
    await withProjectAccess(user.id, projectId)
  } catch {
    return NextResponse.json(ERROR_CODES.AUTH_001, { status: 403 })
  }

  return NextResponse.json(approval)
}

// ─── PATCH — cancelar aprovação ───────────────────────────────────────────────

export async function PATCH(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id: projectId, approvalId } = await params
  const user = await getServerUser()

  if (!user) return NextResponse.json(ERROR_CODES.AUTH_001, { status: 401 })
  if (user.role !== UserRole.SOCIO && user.role !== UserRole.PM) {
    return NextResponse.json(ERROR_CODES.AUTH_001, { status: 403 })
  }

  try {
    await withProjectAccess(user.id, projectId)
  } catch {
    return NextResponse.json(ERROR_CODES.AUTH_001, { status: 403 })
  }

  const approval = await prisma.approvalRequest.findUnique({
    where: { id: approvalId, projectId },
  })
  if (!approval) {
    return NextResponse.json(
      { code: 'APPROVAL_080', message: 'Aprovação não encontrada.' },
      { status: 404 },
    )
  }
  if (approval.status !== 'PENDING') {
    return NextResponse.json(
      { code: 'APPROVAL_051', message: 'Apenas aprovações PENDING podem ser canceladas.' },
      { status: 409 },
    )
  }

  // SEMANTIC ISSUE (GAP-016): Cancel action should ideally set status to 'CANCELLED',
  // but the DB CHECK constraint only allows: PENDING, APPROVED, REJECTED, EXPIRED,
  // CLARIFICATION_REQUESTED (see prisma/migrations/ CHECK constraints).
  // Using 'EXPIRED' as semantic equivalent until a DB migration adds 'CANCELLED'.
  // The history log correctly records the CANCELLED action for audit trail accuracy.
  const updated = await prisma.approvalRequest.update({
    where: { id: approvalId },
    data: { status: 'EXPIRED' },
  })

  await logApprovalHistory({
    approvalId,
    action: 'CANCELLED',
    actorId: user.id,
  })

  return NextResponse.json(updated)
}
