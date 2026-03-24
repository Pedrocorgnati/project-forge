import { NextRequest } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { querySchema } from '@/lib/schemas/rag'
import { SemanticSearchService } from '@/lib/rag/semantic-search-service'
import { ContextAssembler } from '@/lib/rag/context-assembler'
import { AnswerGenerator } from '@/lib/rag/answer-generator'

// ─── POST /api/projects/[id]/rag/query/stream ───────────────────────────────
// SSE streaming: busca semântica + geração de resposta token a token

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: projectId } = await params
  const user = await getServerUser()
  if (!user) {
    return new Response(
      JSON.stringify({ error: { code: 'AUTH_001', message: 'Não autenticado.' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    await withProjectAccess(user.id, projectId, UserRole.DEV)
  } catch {
    return new Response(
      JSON.stringify({ error: { code: 'AUTH_003', message: 'Acesso negado.' } }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const body = await req.json().catch(() => ({}))
  const parseResult = querySchema.safeParse(body)
  if (!parseResult.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'HANDOFF_020',
          message: parseResult.error.issues[0].message,
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }
  const { query } = parseResult.data

  // Verificar RAGIndex
  const hasIndex = await SemanticSearchService.hasIndex(projectId)
  if (!hasIndex) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'RAG_NOT_READY',
          message: 'Projeto não indexado.',
        },
      }),
      { status: 422, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Busca semântica e montagem de contexto
  const searchResults = await SemanticSearchService.search(projectId, query)
  const context = ContextAssembler.assemble(searchResults)

  // Resolver ragIndexId
  const ragIndexId = await SemanticSearchService.getRagIndexId(projectId)
  if (!ragIndexId) {
    return new Response(
      JSON.stringify({ error: { code: 'HANDOFF_080', message: 'Índice não encontrado.' } }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Criar RAGQuery placeholder (sem answer ainda)
  const startTime = Date.now()
  const ragQuery = await prisma.rAGQuery.create({
    data: {
      ragIndexId,
      userId: user.id,
      query,
      sources: context.sourceDocs as unknown as object[],
    },
  })

  // AbortController para interromper o generator AI quando cliente desconecta
  const abortController = new AbortController()
  const MAX_STREAM_MS = 5 * 60 * 1000 // 5 minutos de segurança
  let maxDurationTimer: ReturnType<typeof setTimeout> | null = null

  // ReadableStream SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let fullAnswer = ''

      // Timer de segurança: fecha o stream após MAX_STREAM_MS
      maxDurationTimer = setTimeout(() => {
        abortController.abort()
        try { controller.close() } catch { /* já fechado */ }
      }, MAX_STREAM_MS)

      // Emitir evento inicial com queryId e sourceDocs
      const initEvent = `data: ${JSON.stringify({
        type: 'init',
        queryId: ragQuery.id,
        sourceDocs: context.sourceDocs,
      })}\n\n`
      controller.enqueue(encoder.encode(initEvent))

      try {
        // Processar stream de tokens via AsyncGenerator com abortSignal
        for await (const token of AnswerGenerator.generateStream(query, context, abortController.signal)) {
          fullAnswer += token
          const tokenEvent = `data: ${JSON.stringify({ type: 'token', content: token })}\n\n`
          controller.enqueue(encoder.encode(tokenEvent))
        }

        const latencyMs = Date.now() - startTime

        // Persistir answer completo no RAGQuery
        await prisma.rAGQuery.update({
          where: { id: ragQuery.id },
          data: {
            answer: fullAnswer,
            provider: 'claude-cli',
            latencyMs,
          },
        })

        // Evento de conclusão
        const doneEvent = `data: ${JSON.stringify({
          type: 'done',
          queryId: ragQuery.id,
          latencyMs,
        })}\n\n`
        controller.enqueue(encoder.encode(doneEvent))
      } catch (err) {
        // Ignorar AbortError (desconexão intencional do cliente ou max duration)
        if (err instanceof Error && err.name === 'AbortError') return
        const errorEvent = `data: ${JSON.stringify({
          type: 'error',
          code: 'HANDOFF_060',
          message: err instanceof Error ? err.message : 'Erro na geração',
        })}\n\n`
        controller.enqueue(encoder.encode(errorEvent))
      } finally {
        if (maxDurationTimer) { clearTimeout(maxDurationTimer); maxDurationTimer = null }
        controller.close()
      }
    },
    cancel() {
      // Cliente desconectou — interromper generator AI e limpar timer
      abortController.abort()
      if (maxDurationTimer) { clearTimeout(maxDurationTimer); maxDurationTimer = null }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
