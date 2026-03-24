import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { querySchema } from '@/lib/schemas/rag'
import { SemanticSearchService } from '@/lib/rag/semantic-search-service'
import { ContextAssembler } from '@/lib/rag/context-assembler'
import { AnswerGenerator } from '@/lib/rag/answer-generator'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/rag/query')

// ─── POST /api/projects/[id]/rag/query ──────────────────────────────────────
// Executa busca semântica + geração de resposta completa (não-streaming)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: projectId } = await params
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_001', message: 'Não autenticado.' } },
      { status: 401 },
    )
  }

  try {
    await withProjectAccess(user.id, projectId, UserRole.DEV)

    const body = await req.json().catch(() => ({}))
    const parseResult = querySchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'HANDOFF_020',
            message: parseResult.error.issues[0].message,
          },
        },
        { status: 400 },
      )
    }
    const { query } = parseResult.data

    // Verificar que RAGIndex está COMPLETE
    const hasIndex = await SemanticSearchService.hasIndex(projectId)
    if (!hasIndex) {
      return NextResponse.json(
        {
          error: {
            code: 'RAG_NOT_READY',
            message: 'Projeto não indexado. Indexe os documentos primeiro.',
          },
        },
        { status: 422 },
      )
    }

    // 1. Similarity search
    const searchResults = await SemanticSearchService.search(projectId, query)

    // 2. Montar contexto
    const context = ContextAssembler.assemble(searchResults)

    // 3. Gerar resposta via Claude CLI
    const generated = await AnswerGenerator.generate(query, context)

    // 4. Resolver ragIndexId
    const ragIndexId = await SemanticSearchService.getRagIndexId(projectId)
    if (!ragIndexId) {
      return NextResponse.json(
        { error: { code: 'HANDOFF_080', message: 'Índice não encontrado.' } },
        { status: 404 },
      )
    }

    // 5. Persistir RAGQuery
    const ragQuery = await prisma.rAGQuery.create({
      data: {
        ragIndexId,
        userId: user.id,
        query,
        answer: generated.answer,
        sources: context.sourceDocs as unknown as object[],
        tokensUsed: generated.tokensUsed ?? null,
        provider: generated.provider,
        latencyMs: generated.latencyMs,
      },
    })

    return NextResponse.json({
      data: {
        queryId: ragQuery.id,
        query,
        answer: generated.answer,
        sourceDocs: context.sourceDocs,
        tokensUsed: generated.tokensUsed ?? null,
        latencyMs: generated.latencyMs,
        createdAt: ragQuery.createdAt,
      },
    })
  } catch (err) {
    log.error({ err }, '[RAG Query] Error:')
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json(
      { error: { code: 'SYS_001', message } },
      { status: 500 },
    )
  }
}
