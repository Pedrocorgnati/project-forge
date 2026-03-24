// src/app/api/projects/[id]/client-access/route.ts
// module-16-clientportal-auth / TASK-1 ST002 + ST003 + ST006 + ST007
// POST  /api/projects/[id]/client-access — Criar convite de cliente
// GET   /api/projects/[id]/client-access — Listar acessos do projeto
// Rastreabilidade: INT-102

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { EventBus } from '@/lib/events/bus'
import { EventType } from '@/lib/constants/events'
import { ERROR_CODES } from '@/lib/constants/errors'
import { sendClientInvitationEmail } from '@/lib/email/send-client-invitation'
import { checkInviteRateLimit } from '@/lib/portal/invite-rate-limit'
import { UserRole } from '@prisma/client'

const InviteClientSchema = z.object({
  clientEmail: z.string().email('Email inválido'),
})

// ─── POST — criar convite ──────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: projectId } = await params
  const user = await getServerUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.AUTH_001.code, message: ERROR_CODES.AUTH_001.message } },
      { status: 401 },
    )
  }

  // Apenas SOCIO e PM podem convidar clientes
  if (user.role !== UserRole.SOCIO && user.role !== UserRole.PM) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.AUTH_003.code, message: ERROR_CODES.AUTH_003.message } },
      { status: 403 },
    )
  }

  // Verificar acesso ao projeto
  try {
    await withProjectAccess(user.id, projectId)
  } catch {
    return NextResponse.json(
      { error: { code: ERROR_CODES.AUTH_003.code, message: ERROR_CODES.AUTH_003.message } },
      { status: 403 },
    )
  }

  // Rate limit: max 10 convites por projeto por hora
  const rateLimitResult = checkInviteRateLimit(projectId)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_001', message: 'Limite de convites atingido. Aguarde antes de enviar novos.' } },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimitResult.retryAfter) },
      },
    )
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

  const parsed = InviteClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.VAL_001.code, message: 'Email inválido.', details: parsed.error.flatten() } },
      { status: 422 },
    )
  }

  // Normalizar email (lowercase + trim)
  const clientEmail = parsed.data.clientEmail.trim().toLowerCase()

  // Verificar conflito: convite PENDING ou ACTIVE já existe para este email/projeto
  const existing = await prisma.clientAccess.findFirst({
    where: {
      projectId,
      clientEmail,
      status: { in: ['PENDING', 'ACTIVE'] },
    },
  })

  if (existing) {
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.APPROVAL_080.code,
          message: ERROR_CODES.APPROVAL_080.message,
        },
      },
      { status: 409 },
    )
  }

  // Buscar dados do projeto para o email
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, organizationId: true },
  })

  if (!project) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.PROJECT_080.code, message: ERROR_CODES.PROJECT_080.message } },
      { status: 404 },
    )
  }

  // Criar ClientAccess (inviteToken gerado pelo DB como UUID)
  const clientAccess = await prisma.clientAccess.create({
    data: {
      projectId,
      clientEmail,
      clientName: '',              // será preenchido na aceitação
      inviteToken: crypto.randomUUID(),
      invitedBy: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
    },
    include: {
      project: { select: { id: true, name: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
  })

  // Enviar email de convite (não-bloqueante — falha não cancela o convite)
  const emailResult = await sendClientInvitationEmail({
    to: clientEmail,
    projectName: project.name,
    inviterName: user.name ?? 'Equipe ProjectForge',
    inviteToken: clientAccess.inviteToken,
  })

  // Publicar evento
  if (emailResult.emailSent) {
    await EventBus.publish(
      EventType.CLIENT_INVITED,
      projectId,
      {
        projectId,
        clientEmail,
        inviteToken: clientAccess.inviteToken,
        invitedBy: user.id,
        clientAccessId: clientAccess.id,
      },
      'module-16-clientportal-auth',
    ).catch(() => {}) // não bloquear resposta em caso de falha do EventBus
  } else {
    // Publicar evento de falha de email
    await EventBus.publish(
      EventType.EMAIL_FAILED,
      projectId,
      {
        projectId,
        clientEmail,
        clientAccessId: clientAccess.id,
        reason: emailResult.error ?? 'Resend indisponível',
      },
      'module-16-clientportal-auth',
    ).catch(() => {})
  }

  return NextResponse.json(
    {
      ...clientAccess,
      emailSent: emailResult.emailSent,
    },
    { status: 201 },
  )
}

// ─── GET — listar acessos do projeto ──────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: projectId } = await params
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

  const accesses = await prisma.clientAccess.findMany({
    where: { projectId },
    include: {
      inviter: { select: { id: true, name: true, email: true } },
    },
    orderBy: { invitedAt: 'desc' },
  })

  return NextResponse.json(accesses)
}
