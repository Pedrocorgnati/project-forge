/**
 * Erros tipados do EmbeddingService — HandoffAI (módulo 12)
 * Cada erro mapeia para um código do ERROR-CATALOG.
 */

export type HandoffErrorCode = 'HANDOFF_050' | 'HANDOFF_053' | 'SYS_001'

export class HandoffEmbeddingError extends Error {
  constructor(
    public readonly code: HandoffErrorCode,
    public readonly detail: string,
    public readonly retryable: boolean = false,
  ) {
    super(`[${code}] ${detail}`)
    this.name = 'HandoffEmbeddingError'
  }
}

/**
 * HANDOFF_053: EmbeddingService retornou vetor com dimensão incorreta.
 * Não retentável — requer correção de configuração.
 */
export function createDimensionMismatchError(expected: number, got: number): HandoffEmbeddingError {
  return new HandoffEmbeddingError(
    'HANDOFF_053',
    `Embedding dimension mismatch: expected ${expected}, got ${got}. Check EMBEDDING_PROVIDER configuration.`,
    false,
  )
}

/**
 * HANDOFF_050: Indexação bloqueada — pgvector indisponível ou indexação já em andamento.
 * Não retentável — requer intervenção.
 */
export function createIndexationBlockedError(detail: string): HandoffEmbeddingError {
  return new HandoffEmbeddingError(
    'HANDOFF_050',
    detail,
    false,
  )
}

/**
 * SYS_001: Timeout ou erro transitório durante geração de embedding.
 * Retentável com backoff exponencial.
 */
export function createEmbeddingTimeoutError(provider: string, ms: number): HandoffEmbeddingError {
  return new HandoffEmbeddingError(
    'SYS_001',
    `Embedding timeout after ${ms}ms on provider '${provider}'. Retry with exponential backoff.`,
    true,
  )
}
