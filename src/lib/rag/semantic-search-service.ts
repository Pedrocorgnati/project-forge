/**
 * SemanticSearchService — busca semântica via pgvector cosine similarity
 *
 * Fluxo: embed query → cosine similarity search → top-K chunks relevantes
 * Usa vector(384) compatível com text-embedding-3-small (module-12).
 */

import { prisma } from '@/lib/db'
import { EmbeddingService } from './embedding-service'
import type { SearchResult } from '@/types/rag'

export interface SearchOptions {
  topK?: number          // default: 5
  minSimilarity?: number // default: 0.2
}

export class SemanticSearchService {
  /**
   * Busca chunks relevantes para a query no RAGIndex do projeto.
   * Retorna array vazio se RAGIndex não existe ou não está COMPLETE.
   */
  static async search(
    projectId: string,
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    const topK = options.topK ?? 5
    const minSimilarity = options.minSimilarity ?? 0.2

    // Verificar RAGIndex COMPLETE
    const ragIndex = await prisma.rAGIndex.findUnique({
      where: { projectId },
      select: { id: true, indexationStatus: true },
    })

    if (!ragIndex || ragIndex.indexationStatus !== 'COMPLETE') {
      return []
    }

    // Gerar embedding da query
    const { vector } = await EmbeddingService.embed(query)
    const vectorLiteral = `[${vector.join(',')}]`

    // Similarity search via pgvector
    // <=> é o operador de cosine distance; similarity = 1 - distance
    const results = await prisma.$queryRaw<
      Array<{
        embedding_id: string
        document_id: string | null
        document_title: string
        chunk_index: number
        chunk_text: string
        similarity: number
      }>
    >`
      SELECT
        e.id                  AS embedding_id,
        e.rag_document_id     AS document_id,
        COALESCE(d.source_path, 'unknown') AS document_title,
        COALESCE((e.metadata->>'chunkIndex')::int, 0) AS chunk_index,
        e.chunk_text          AS chunk_text,
        1 - (e.embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM embeddings e
      LEFT JOIN rag_documents d ON e.rag_document_id = d.id
      WHERE e.rag_index_id = ${ragIndex.id}::uuid
        AND e.embedding IS NOT NULL
        AND 1 - (e.embedding <=> ${vectorLiteral}::vector) >= ${minSimilarity}
      ORDER BY e.embedding <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `

    return results.map((r: { embedding_id: string; document_id: string; document_title: string; chunk_index: unknown; chunk_text: string; similarity: unknown }) => ({
      embeddingId: r.embedding_id,
      documentId: r.document_id,
      documentTitle: r.document_title,
      chunkIndex: Number(r.chunk_index),
      chunkText: r.chunk_text,
      similarity: Number(r.similarity),
    }))
  }

  /**
   * Verifica se há documentos indexados (COMPLETE) para o projeto.
   */
  static async hasIndex(projectId: string): Promise<boolean> {
    const ragIndex = await prisma.rAGIndex.findUnique({
      where: { projectId },
      select: { indexationStatus: true },
    })
    return ragIndex?.indexationStatus === 'COMPLETE'
  }

  /**
   * Retorna o RAGIndex ID para o projeto, ou null.
   */
  static async getRagIndexId(projectId: string): Promise<string | null> {
    const ragIndex = await prisma.rAGIndex.findUnique({
      where: { projectId },
      select: { id: true },
    })
    return ragIndex?.id ?? null
  }
}
