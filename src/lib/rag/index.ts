// ─── RAG BARREL ───────────────────────────────────────────────────────────────

export { DocumentChunker } from './document-chunker'
export type { ChunkOptions } from './document-chunker'
export { DocumentIndexer } from './document-indexer'
export { EmbeddingService } from './embedding-service'
export type { EmbeddingResult } from './embedding-service'
export { SemanticSearchService } from './semantic-search-service'
export { ContextAssembler } from './context-assembler'
export { AnswerGenerator } from './answer-generator'
export { GitHubFetcher } from './github-fetcher'
export * from './constants'
export * from './errors'
export {
  GitHubApiUnreachableError,
  GitHubTokenInvalidError,
  GitHubRepoNotFoundError,
  mapGitHubError,
} from './github-errors'
export {
  HandoffEmbeddingError,
  createDimensionMismatchError,
  createIndexationBlockedError,
  createEmbeddingTimeoutError,
} from './embedding-errors'
export type { HandoffErrorCode } from './embedding-errors'
