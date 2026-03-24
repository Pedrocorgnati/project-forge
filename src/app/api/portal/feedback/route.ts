// src/app/api/portal/feedback/route.ts
// module-17-clientportal-approvals / TASK-1 ST006
// POST /api/portal/feedback — CLIENTE envia feedback livre sobre o projeto
// Rastreabilidade: INT-105

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { ERROR_CODES } from '@/lib/constants/errors'
import { EventBus } from '@/lib/events/bus'
import { EventType } from '@/lib/constants/events'
import { UserRole } from '@prisma/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/portal/feedback')

const FeedbackSchema = z.object({
  projectId: z.string().uuid('ID do projeto inválido'),
  content: z.string().min(5, 'Feedback deve ter ao menos 5 caracteres').max(2000),
  category: z.enum(['GENERAL', 'APPROVAL', 'CONCERN']).default('GENERAL'),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getServerUser()

  if (!user) {
    return NextResponse.json(ERROR_CODES.AUTH_001, { status: 401 })
  }
  if (user.role !== UserRole.CLIENTE) {
    return NextResponse.json(
      { code: 'AUTH_001', message: 'Apenas clientes podem enviar feedback.' },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = FeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VAL_001', errors: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { projectId, content, category } = parsed.data

  // Buscar clientAccess ativo para este projeto e email do usuário
  const clientAccess = await prisma.clientAccess.findFirst({
    where: { clientEmail: user.email, projectId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!clientAccess) {
    return NextResponse.json(
      { code: 'AUTH_001', message: 'Sem acesso ativo neste projeto.' },
      { status: 403 },
    )
  }

  const feedback = await prisma.clientFeedback.create({
    data: {
      projectId,
      clientAccessId: clientAccess.id,
      content,
      category,
    },
  })

  // Publicar evento de feedback (fire-and-forget — falha não quebra a criação)
  // NOTE: CLIENT_FEEDBACK_SUBMITTED não existe em EventType; usando cast seguro
  // até que o evento seja adicionado em src/lib/constants/events.ts (GAP-015)
  try {
    await EventBus.publish(
      'CLIENT_FEEDBACK_SUBMITTED' as unknown as EventType,
      projectId,
      {
        projectId,
        clientAccessId: clientAccess.id,
        feedbackId: feedback.id,
        category,
      } as never,
      'module-17',
    )
  } catch (err) {
    log.error({ err }, '[module-17] CLIENT_FEEDBACK_SUBMITTED publish failed:')
  }

  return NextResponse.json(feedback, { status: 201 })
}
