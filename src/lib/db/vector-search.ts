/**
 * vector-search.ts
 *
 * Wrapper TypeScript para a função SQL `match_embeddings`.
 * Executa busca por similaridade de cosseno no pgvector.
 */

import { prisma } from '@/lib/db'

export interface EmbeddingMatch {
  id: string
  ragDocumentId: string | null
  chunkText: string
  similarity: number
}

/**
 * Busca embeddings mais similares ao vetor de query.
 *
 * @param queryVector  Vetor de embedding da query (384 dimensões)
 * @param ragIndexId   ID do RAGIndex a pesquisar
 * @param matchCount   Número máximo de resultados (default: 5)
 * @param matchThreshold Similaridade mínima 0.0-1.0 (default: 0.7)
 */
export async function matchEmbeddings(
  queryVector: number[],
  ragIndexId: string,
  matchCount = 5,
  matchThreshold = 0.7
): Promise<EmbeddingMatch[]> {
  if (queryVector.length !== 384) {
    throw new Error(
      `Vector dimension mismatch: expected 384, got ${queryVector.length}`
    )
  }
  if (matchThreshold < 0 || matchThreshold > 1) {
    throw new Error('matchThreshold must be between 0.0 and 1.0')
  }

  const vectorStr = `[${queryVector.join(',')}]`

  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      ragDocumentId: string | null
      chunk_text: string
      similarity: number
    }>
  >`
    SELECT * FROM match_embeddings(
      ${vectorStr}::vector,
      ${ragIndexId}::uuid,
      ${matchCount}::int,
      ${matchThreshold}::float
    )
  `

  return rows.map((r: { id: string; ragDocumentId: string | null; chunk_text: string; similarity: number }) => ({
    id: r.id,
    ragDocumentId: r.ragDocumentId,
    chunkText: r.chunk_text,
    similarity: Number(r.similarity),
  }))
}

/**
 * Busca semântica simples — encapsula matchEmbeddings com defaults liberais.
 * Usar em contextos de HandoffAI Q&A.
 */
export async function semanticSearch(
  queryVector: number[],
  ragIndexId: string,
  options: { topK?: number; threshold?: number } = {}
): Promise<EmbeddingMatch[]> {
  return matchEmbeddings(
    queryVector,
    ragIndexId,
    options.topK ?? 5,
    options.threshold ?? 0.65
  )
}
