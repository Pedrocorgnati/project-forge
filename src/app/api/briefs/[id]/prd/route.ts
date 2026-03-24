import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/constants/errors'
import { UserRole } from '@prisma/client'
import { BriefService, BriefNotFoundError, BriefNotCompletedError } from '@/lib/briefforge/brief-service'
import { DocumentService, ImmutableDocumentError } from '@/lib/briefforge/document-service'
import { PRDGenerator } from '@/lib/briefforge/prd-generator'
import { PRDStatus } from '@/types/briefforge'
import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/briefs/prd')

// ─── POST /api/briefs/[id]/prd — Disparar geração de nova versão do PRD ───────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.AUTH_001.code, message: ERROR_CODES.AUTH_001.message } },
      { status: 401 },
    )
  }

  try {
    // 1. Buscar brief e validar que está COMPLETED
    const { id } = await params
    const brief = await BriefService.assertBriefCompleted(id)

    // 2. RBAC: apenas PM e SOCIO podem gerar PRD
    await withProjectAccess(user.id, brief.projectId, UserRole.PM)

    // 3. Buscar brief com sessões para o gerador
    const briefWithSessions = await prisma.brief.findUnique({
      where: { id: brief.id },
      include: {
        sessions: {
          where: { status: 'COMPLETED' },
          orderBy: { startedAt: 'desc' },
          include: { questions: { orderBy: { order: 'asc' } } },
        },
      },
    })

    if (!briefWithSessions || briefWithSessions.sessions.length === 0) {
      return NextResponse.json(
        { error: { code: 'BRIEF_083', message: ERROR_CODES.BRIEF_083.message } },
        { status: 422 },
      )
    }

    // 4. Criar registro PRDDocument com status GENERATING (imutável, version++)
    const prdDoc = await DocumentService.createVersion({
      briefId: brief.id,
      generatedBy: user.id,
      status: PRDStatus.GENERATING,
      content: '',
    })

    // 5. Disparar geração em background (fire-and-forget — não bloqueia resposta)
    PRDGenerator.generate(
      prdDoc.id,
      briefWithSessions as Parameters<typeof PRDGenerator.generate>[1],
      user.id,
    ).catch(async (err) => {
      log.error({ err }, '[PRDGenerator] Falha na geração:')
      await DocumentService.markError(prdDoc.id, err instanceof Error ? err.message : String(err))
    })

    return NextResponse.json({ data: prdDoc }, { status: 202 })
  } catch (err) {
    if (err instanceof BriefNotFoundError) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.BRIEF_080.code, message: ERROR_CODES.BRIEF_080.message } },
        { status: 404 },
      )
    }
    if (err instanceof BriefNotCompletedError) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.BRIEF_083.code, message: ERROR_CODES.BRIEF_083.message } },
        { status: 422 },
      )
    }
    if (err instanceof ImmutableDocumentError) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.DOC_050.code, message: ERROR_CODES.DOC_050.message } },
        { status: 422 },
      )
    }
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.statusCode },
      )
    }
    log.error({ err }, '[POST /api/briefs/[id]/prd]')
    return NextResponse.json(
      { error: { code: ERROR_CODES.SYS_001.code, message: ERROR_CODES.SYS_001.message } },
      { status: 500 },
    )
  }
}

// ─── GET /api/briefs/[id]/prd — Retorna última versão do PRD ──────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: ERROR_CODES.AUTH_001.code, message: ERROR_CODES.AUTH_001.message } },
      { status: 401 },
    )
  }

  try {
    // Buscar brief para obter projectId
    const { id } = await params
    const brief = await prisma.brief.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    })

    if (!brief) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.BRIEF_080.code, message: ERROR_CODES.BRIEF_080.message } },
        { status: 404 },
      )
    }

    // RBAC: todos os roles podem ler o PRD
    await withProjectAccess(user.id, brief.projectId)

    const latestPRD = await DocumentService.findLatest(brief.id)

    if (!latestPRD) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.PRD_080.code, message: ERROR_CODES.PRD_080.message } },
        { status: 404 },
      )
    }

    // PRD sendo gerado → 202 com status GENERATING
    if (latestPRD.status === PRDStatus.GENERATING) {
      return NextResponse.json(
        { status: 'GENERATING', message: 'PRD sendo gerado...' },
        { status: 202 },
      )
    }

    // PRD com erro → 500
    if (latestPRD.status === PRDStatus.ERROR) {
      return NextResponse.json(
        { error: { code: ERROR_CODES.PRD_001.code, message: ERROR_CODES.PRD_001.message } },
        { status: 500 },
      )
    }

    // Registrar acesso (fire-and-forget)
    const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined
    const userAgent = req.headers.get('user-agent') ?? undefined
    DocumentService.logAccess({
      documentId: latestPRD.id,
      accessedBy: user.id,
      action: 'VIEW',
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ data: latestPRD })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.statusCode },
      )
    }
    log.error({ err }, '[GET /api/briefs/[id]/prd]')
    return NextResponse.json(
      { error: { code: ERROR_CODES.SYS_001.code, message: ERROR_CODES.SYS_001.message } },
      { status: 500 },
    )
  }
}
