// src/app/api/portal/[token]/accept/route.ts
// module-16-clientportal-auth / TASK-1 ST005
// POST /api/portal/[token]/accept — Aceitar convite: cria conta Supabase Auth + User Prisma
// Endpoint público — não requer autenticação prévia
// Rastreabilidade: INT-103

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createClientUser } from '@/lib/portal/create-client-user'
import { EventBus } from '@/lib/events/bus'
import { EventType } from '@/lib/constants/events'
import { ERROR_CODES } from '@/lib/constants/errors'
import { AppError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/portal/accept')

const AcceptInviteSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params

  // Buscar e validar o ClientAccess pelo token
  const clientAccess = await prisma.clientAccess.findUnique({
    where: { inviteToken: token },
    include: {
      project: { select: { id: true, name: true, organizationId: true } },
    },
  })

  if (!clientAccess || clientAccess.status !== 'PENDING') {
    const code =
      !clientAccess
        ? ERROR_CODES.APPROVAL_081.code
        : clientAccess.status === 'ACTIVE'
          ? ERROR_CODES.APPROVAL_082.code
          : ERROR_CODES.APPROVAL_083.code
    const message =
      !clientAccess
        ? ERROR_CODES.APPROVAL_081.message
        : clientAccess.status === 'ACTIVE'
          ? ERROR_CODES.APPROVAL_082.message
          : ERROR_CODES.APPROVAL_083.message
    return NextResponse.json({ error: { code, message } }, { status: 400 })
  }

  // Validar body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: ERROR_CODES.VAL_001.code, message: 'Body JSON inválido.' } },
      { status: 422 },
    )
  }

  const parsed = AcceptInviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.VAL_001.code, message: 'Dados inválidos.', details: parsed.error.flatten() } },
      { status: 422 },
    )
  }

  // Criar conta Supabase Auth + User Prisma atomicamente
  let user
  try {
    user = await createClientUser({
      email: clientAccess.clientEmail,
      password: parsed.data.password,
      name: parsed.data.name,
      organizationId: clientAccess.project.organizationId,
    })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        {
          status: err.statusCode,
          headers: err.statusCode === 503 ? { 'Retry-After': '30' } : undefined,
        },
      )
    }
    log.error({ err }, '[portal/accept] Unexpected error:')
    return NextResponse.json(
      { error: { code: ERROR_CODES.SYS_001.code, message: ERROR_CODES.SYS_001.message } },
      { status: 500 },
    )
  }

  // Ativar o ClientAccess e registrar nome do cliente
  await prisma.clientAccess.update({
    where: { id: clientAccess.id },
    data: {
      status: 'ACTIVE',
      acceptedAt: new Date(),
      clientName: parsed.data.name,
    },
  })

  // Publicar evento CLIENT_ACCEPTED
  await EventBus.publish(
    EventType.CLIENT_ACCEPTED,
    clientAccess.project.id,
    {
      projectId: clientAccess.project.id,
      clientEmail: clientAccess.clientEmail,
      userId: user.id,
      clientAccessId: clientAccess.id,
    },
    'module-16-clientportal-auth',
  ).catch(() => {}) // não bloquear resposta

  return NextResponse.json({ success: true, userId: user.id })
}
