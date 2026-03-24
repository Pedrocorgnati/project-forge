// src/app/api/portal/[token]/route.ts
// module-16-clientportal-auth / TASK-1 ST004
// GET /api/portal/[token] — Validar token de convite (endpoint público)
// Retorna apenas dados necessários para exibir o convite — sem dados sensíveis do projeto
// Rastreabilidade: INT-102

import { NextRequest, NextResponse } from 'next/server'
import { validateInviteToken } from '@/lib/portal/validate-token'
import { ERROR_CODES } from '@/lib/constants/errors'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params

  const result = await validateInviteToken(token)

  if (!result.valid) {
    switch (result.error) {
      case 'NOT_FOUND':
        return NextResponse.json(
          { error: { code: ERROR_CODES.APPROVAL_081.code, message: ERROR_CODES.APPROVAL_081.message } },
          { status: 404 },
        )
      case 'REVOKED':
        return NextResponse.json(
          { error: { code: ERROR_CODES.APPROVAL_083.code, message: ERROR_CODES.APPROVAL_083.message } },
          { status: 410 },
        )
      case 'ACTIVE':
        return NextResponse.json(
          { error: { code: ERROR_CODES.APPROVAL_082.code, message: ERROR_CODES.APPROVAL_082.message } },
          { status: 409 },
        )
      case 'EXPIRED':
        return NextResponse.json(
          { error: { code: 'APPROVAL_084', message: 'Este convite expirou.' } },
          { status: 410 },
        )
    }
  }

  const { clientAccess } = result

  // Retornar apenas dados necessários — sem dados sensíveis do projeto
  return NextResponse.json({
    projectName: clientAccess.project.name,
    inviterName: clientAccess.inviter?.name ?? 'Equipe ProjectForge',
    clientEmail: clientAccess.clientEmail,
    status: clientAccess.status,
  })
}
