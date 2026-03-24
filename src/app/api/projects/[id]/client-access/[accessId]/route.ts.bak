// src/app/api/projects/[id]/client-access/[accessId]/route.ts
// module-16-clientportal-auth / TASK-2 ST006 (backend)
// DELETE /api/projects/[id]/client-access/[accessId] — Revogar acesso do cliente
// Rastreabilidade: INT-104

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { ERROR_CODES } from '@/lib/constants/errors'
import { UserRole } from '@prisma/client'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; accessId: string }> },
): Promise<NextResponse> {
  const { id: projectId, accessId } = await params
  const user = await getServerUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.AUTH_001.code, message: ERROR_CODES.AUTH_001.message } },
      { status: 401 },
    )
  }

  if (user.role !== UserRole.SOCIO && user.role !== UserRole.PM) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.AUTH_003.code, message: ERROR_CODES.AUTH_003.message } },
      { status: 403 },
    )
  }

  try {
    await withProjectAccess(user.id, projectId)
  } catch {
    return NextResponse.json(
      { error: { code: ERROR_CODES.AUTH_003.code, message: ERROR_CODES.AUTH_003.message } },
      { status: 403 },
    )
  }

  const clientAccess = await prisma.clientAccess.findFirst({
    where: { id: accessId, projectId },
  })

  if (!clientAccess) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.APPROVAL_081.code, message: 'Acesso não encontrado.' } },
      { status: 404 },
    )
  }

  if (clientAccess.status === 'REVOKED') {
    return NextResponse.json(
      { error: { code: ERROR_CODES.APPROVAL_083.code, message: ERROR_CODES.APPROVAL_083.message } },
      { status: 409 },
    )
  }

  await prisma.clientAccess.update({
    where: { id: accessId },
    data: { status: 'REVOKED', revokedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
