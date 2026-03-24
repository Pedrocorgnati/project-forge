/**
 * Tipos de domínio RAG (Retrieval-Augmented Generation)
 *
 * Alinhados com o schema Prisma real (prisma/schema.prisma).
 *
 * SCHEMA DRIFT (TASK-0/ST003 — 2026-03-22):
 * ─────────────────────────────────────────────────
 * O FDD HandoffAI especifica RAGIndexStatus { IDLE | INDEXING | READY | ERROR }
 * e vector(1536), mas o Prisma schema implementado usa:
 *   - IndexationStatus { PENDING | IN_PROGRESS | COMPLETE | FAILED }
 *   - vector(384) (embedding-3-small compact)
 * Decisão: usar valores do Prisma como canônicos.
 * ─────────────────────────────────────────────────
 */

// ── ENUMS (espelham Prisma) ───────────────────────────────────────────────────

/** Status de indexação do RAGIndex */
export enum IndexationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}

/** Tipo de fonte de um RAGDocument */
export type DocumentSourceType = 'github' | 'docs' | 'manual'

/** Status de sync do GitHub */
export type SyncStatus = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'

// ── INTERFACES (espelham Prisma models) ───────────────────────────────────────

/** Índice RAG (1:1 por projeto) */
export interface RAGIndex {
  id: string
  projectId: string
  githubRepoUrl: string | null
  githubOwner: string | null
  githubRepo: string | null
  lastCommitSha: string | null
  totalChunks: number
  indexedExtensions: string[]
  indexationStatus: IndexationStatus
  lastIndexedAt: Date | null
  createdAt: Date
}

/** Documento fonte no índice RAG */
export interface RAGDocument {
  id: string
  ragIndexId: string
  sourceType: DocumentSourceType
  sourcePath: string
  content: string
  metadata: Record<string, unknown>
  commitSha: string | null
  createdAt: Date
}

/** Embedding pgvector (sem o campo vector bruto — usar number[] na borda) */
export interface Embedding {
  id: string
  ragIndexId: string
  ragDocumentId: string | null
  chunkText: string
  filePath: string
  commitSha: string
  metadata: Record<string, unknown>
  createdAt: Date
}

/** Configuração de sync com GitHub */
export interface GitHubSync {
  id: string
  projectId: string
  installationId: string
  repoOwner: string
  repoName: string
  lastWebhookAt: Date | null
  syncStatus: SyncStatus
  createdAt: Date
  updatedAt: Date
}

/** Query RAG (histórico) */
export interface RAGQuery {
  id: string
  ragIndexId: string
  userId: string
  query: string
  answer: string | null
  sources: Record<string, unknown>[]
  tokensUsed: number | null
  provider: string | null
  latencyMs: number | null
  createdAt: Date
}

/** Resultado de busca semântica */
export interface SearchResult {
  embeddingId: string
  documentId: string | null
  documentTitle: string
  chunkIndex: number
  chunkText: string
  similarity: number
}

/** Contexto montado para o prompt */
export interface AssembledContext {
  contextText: string
  sourceDocs: SourceDoc[]
}

/** Fonte citada na resposta */
export interface SourceDoc {
  documentTitle: string
  documentId: string | null
  chunkIndex: number
  excerpt: string
}

/** Resposta gerada pelo AnswerGenerator */
export interface GeneratedAnswer {
  answer: string
  tokensUsed?: number
  provider: string
  hasContext: boolean
  latencyMs: number
}

// ── TIPOS DE DOMÍNIO ──────────────────────────────────────────────────────────

/** Vetor de embedding (384 dimensões — OpenAI text-embedding-3-small) */
export type EmbeddingVector = number[]

/** Chunk produzido pelo DocumentChunker */
export interface DocumentChunk {
  text: string
  chunkIndex: number
  totalChunks: number
  documentId: string
  sourceTitle: string
  charStart: number
  charEnd: number
}

/** Resultado do pipeline de indexação */
export interface IndexingResult {
  ragIndexId: string
  documentsIndexed: number
  chunksCreated: number
  errors: IndexingError[]
  durationMs: number
}

/** Erro durante indexação de um chunk/documento */
export interface IndexingError {
  documentId: string
  chunkIndex?: number
  errorCode: string
  message: string
}

/** Arquivo buscado do GitHub para indexação */
export interface GitHubFile {
  path: string
  sha: string
  content: string
  size: number
}

// ── PAYLOADS DE EVENTO ────────────────────────────────────────────────────────

/** Payload do evento RAG_INDEX_STARTED */
export interface RAGIndexStartedPayload {
  projectId: string
  ragIndexId: string
  documentCount: number
}

/** Payload do evento RAG_INDEX_COMPLETED */
export interface RAGIndexCompletedPayload {
  projectId: string
  ragIndexId: string
  documentsIndexed: number
  chunksCreated: number
  durationMs: number
}

// ── API RESPONSE TYPES ────────────────────────────────────────────────────────

/** Response do GET /api/projects/[id]/rag/status */
export interface RAGStatusResponse {
  ragIndex: RAGIndex | null
  documents: Pick<RAGDocument, 'id' | 'sourceType' | 'sourcePath' | 'createdAt'>[]
  gitHubSync: GitHubSync | null
}

/** Response do POST /api/projects/[id]/rag/index */
export interface StartIndexResponse {
  ragIndexId: string
  indexationStatus: IndexationStatus
}

/** Response do POST /api/projects/[id]/rag/github-sync */
export interface GitHubSyncResponse {
  gitHubSyncId: string
  syncStatus: SyncStatus
}
