/**
 * embeddings.ts
 *
 * Wrappers para inserção e leitura de embeddings pgvector (vector(384)).
 * O campo `embedding` usa tipo Unsupported("vector(384)") no Prisma —
 * operações de escrita/leitura do vetor exigem $executeRaw / $queryRaw.
 */

import { prisma } from '@/lib/db'

const VECTOR_DIM = 384

/** Valida que o vetor tem a dimensão correta */
function assertDimension(vector: number[]) {
  if (vector.length !== VECTOR_DIM) {
    throw new Error(
      `Vector dimension mismatch: expected ${VECTOR_DIM}, got ${vector.length}`
    )
  }
}

/** Insere um embedding no banco via raw SQL */
export async function insertEmbedding(params: {
  ragIndexId: string
  ragDocumentId?: string
  chunkText: string
  vector: number[]
  filePath: string
  commitSha: string
  metadata?: Record<string, unknown>
}): Promise<string> {
  assertDimension(params.vector)

  const id = crypto.randomUUID()
  const vectorStr = `[${params.vector.join(',')}]`

  await prisma.$executeRaw`
    INSERT INTO "embeddings" (
      "id",
      "rag_index_id",
      "rag_document_id",
      "chunk_text",
      "embedding",
      "file_path",
      "commit_sha",
      "metadata",
      "created_at"
    ) VALUES (
      ${id}::uuid,
      ${params.ragIndexId}::uuid,
      ${params.ragDocumentId ?? null}::uuid,
      ${params.chunkText},
      ${vectorStr}::vector,
      ${params.filePath},
      ${params.commitSha},
      ${JSON.stringify(params.metadata ?? {})}::jsonb,
      NOW()
    )
  `

  return id
}

/** Busca um embedding por ID (sem o vetor — campos escalares apenas) */
export async function getEmbeddingById(id: string) {
  const result = await prisma.$queryRaw<
    Array<{
      id: string
      rag_index_id: string
      rag_document_id: string | null
      chunk_text: string
      file_path: string
      commit_sha: string
    }>
  >`
    SELECT id, rag_index_id, rag_document_id, chunk_text, file_path, commit_sha
    FROM embeddings
    WHERE id = ${id}::uuid
  `
  return result[0] ?? null
}

/** Lista embeddings de um RAGIndex (sem o vetor) */
export async function listEmbeddingsByIndex(ragIndexId: string) {
  return prisma.$queryRaw<
    Array<{
      id: string
      rag_document_id: string | null
      chunk_text: string
      file_path: string
    }>
  >`
    SELECT id, rag_document_id, chunk_text, file_path
    FROM embeddings
    WHERE rag_index_id = ${ragIndexId}::uuid
    ORDER BY created_at DESC
  `
}

/** Exclui todos os embeddings de um RAGIndex (re-indexação completa) */
export async function deleteEmbeddingsByIndex(ragIndexId: string): Promise<number> {
  const result = await prisma.$executeRaw`
    DELETE FROM embeddings
    WHERE rag_index_id = ${ragIndexId}::uuid
  `
  return Number(result)
}
