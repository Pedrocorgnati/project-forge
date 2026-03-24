// src/app/api/cron/retry-failed-embeddings/route.ts
// BE-06b — Reindexar documentos com status FAILED ou PENDING antigos
// Schedule: 0 */6 * * * (a cada 6h) — configurar em vercel.json
// Protegido por CRON_SECRET no header Authorization

import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'
import { EmbeddingService } from '@/lib/rag/embedding-service'
import { createLogger } from '@/lib/logger'

const log = createLogger('cron/retry-embeddings')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BATCH_LIMIT = 50
const STALE_THRESHOLD_MS = 60 * 60 * 1000 // 1h

async function retryFailedEmbeddings(): Promise<{ retried: number; succeeded: number; errors: string[] }> {
  const prisma = getPrismaClient()
  const errors: string[] = []
  let retried = 0
  let succeeded = 0

  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS)

  // Buscar chunks com embedding pendente ou com falha
  const chunks = await prisma.rAGChunk.findMany({
    where: {
      OR: [
        { embeddingStatus: 'FAILED' },
        { embeddingStatus: 'PENDING', updatedAt: { lte: staleThreshold } },
      ],
    },
    take: BATCH_LIMIT,
    orderBy: { updatedAt: 'asc' },
    select: { id: true, content: true },
  })

  for (const chunk of chunks) {
    retried++
    try {
      const result = await EmbeddingService.embed(chunk.content)
      await prisma.rAGChunk.update({
        where: { id: chunk.id },
        data: {
          embedding: result.vector as never,
          embeddingStatus: 'DONE',
          embeddingError: null,
        },
      })
      succeeded++
    } catch (err) {
      const msg = String(err)
      errors.push(`chunk ${chunk.id}: ${msg}`)
      await prisma.rAGChunk.update({
        where: { id: chunk.id },
        data: { embeddingStatus: 'FAILED', embeddingError: msg },
      }).catch(() => undefined)
    }
  }

  return { retried, succeeded, errors }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await retryFailedEmbeddings()

    if (result.errors.length > 0) {
      log.error({ err: result.errors }, '[cron/retry-failed-embeddings] Erros parciais:')
    }

    return NextResponse.json({
      ok: true,
      ...result,
      processedAt: new Date().toISOString(),
    })
  } catch (err) {
    log.error({ err }, '[cron/retry-failed-embeddings] Falha crítica:')
    return NextResponse.json(
      { error: 'Internal server error', message: String(err) },
      { status: 500 },
    )
  }
}
