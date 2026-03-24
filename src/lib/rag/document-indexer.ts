/**
 * DocumentIndexer — pipeline chunk → embed → store no pgvector
 *
 * Orquestra a indexação de documentos RAG:
 * 1. Chunking via DocumentChunker
 * 2. Geração de embeddings via EmbeddingService
 * 3. Persistência via raw SQL (pgvector não suportado pelo Prisma ORM)
 *
 * Erros em chunks individuais não abortam o pipeline.
 */

import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { DocumentChunker } from './document-chunker'
import { EmbeddingService } from './embedding-service'
import { insertEmbedding, deleteEmbeddingsByIndex } from '@/lib/db/embeddings'

const log = createLogger('rag/document-indexer')

export interface IndexDocumentInput {
  ragIndexId: string
  ragDocumentId: string
  sourcePath: string
  content: string
  commitSha?: string
}

export interface IndexResult {
  documentId: string
  chunksCreated: number
  durationMs: number
  error?: string
}

export class DocumentIndexer {
  /**
   * Indexa um único documento: chunk → embed → store.
   * Em caso de erro em um chunk individual, registra e continua.
   */
  static async indexDocument(doc: IndexDocumentInput): Promise<IndexResult> {
    const startTime = Date.now()

    try {
      // 1. Chunking
      const chunks = DocumentChunker.chunk(doc.content)
      if (chunks.length === 0) {
        return { documentId: doc.ragDocumentId, chunksCreated: 0, durationMs: 0 }
      }

      // 2. Gerar embeddings em batch
      const chunkTexts = chunks.map((c) => c.text)
      const embedResults = await EmbeddingService.embedBatch(chunkTexts)

      // 3. Persistir embeddings via raw SQL (necessário para tipo vector)
      let successCount = 0
      for (let i = 0; i < chunks.length; i++) {
        try {
          await insertEmbedding({
            ragIndexId: doc.ragIndexId,
            ragDocumentId: doc.ragDocumentId,
            chunkText: chunks[i].text,
            vector: embedResults[i].vector,
            filePath: doc.sourcePath,
            commitSha: doc.commitSha ?? 'manual',
            metadata: {
              chunkIndex: chunks[i].index,
              totalChunks: chunks.length,
              charStart: chunks[i].charStart,
              charEnd: chunks[i].charEnd,
            },
          })
          successCount++
        } catch (chunkErr) {
          log.error(
            { chunkIndex: i, ragDocumentId: doc.ragDocumentId, err: chunkErr },
            '[DocumentIndexer] Chunk falhou — continuando pipeline',
          )
          // Continua com os demais chunks — não aborta pipeline
        }
      }

      return {
        documentId: doc.ragDocumentId,
        chunksCreated: successCount,
        durationMs: Date.now() - startTime,
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      return {
        documentId: doc.ragDocumentId,
        chunksCreated: 0,
        durationMs: Date.now() - startTime,
        error: errorMsg,
      }
    }
  }

  /**
   * Indexa múltiplos documentos sequencialmente, com callback de progresso.
   */
  static async indexAll(
    ragIndexId: string,
    documents: IndexDocumentInput[],
    onProgress?: (completed: number, total: number) => Promise<void>,
  ): Promise<IndexResult[]> {
    // Limpar embeddings antigos antes de reindexar
    await deleteEmbeddingsByIndex(ragIndexId)

    const results: IndexResult[] = []
    for (let i = 0; i < documents.length; i++) {
      const result = await this.indexDocument(documents[i])
      results.push(result)
      if (onProgress) await onProgress(i + 1, documents.length)
    }
    return results
  }
}
