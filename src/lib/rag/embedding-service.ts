/**
 * EmbeddingService — geração de embeddings vetoriais via OpenAI
 *
 * Provedor: OpenAI text-embedding-3-small (384 dimensões)
 * O AIProvider do module-2 não suporta embeddings — usa API OpenAI diretamente.
 */

import type { EmbeddingVector } from '@/types/rag'
import { RAG_EMBEDDING_DIMENSIONS, RAG_EMBEDDING_BATCH_SIZE, RAG_GITHUB_RATE_LIMIT_DELAY_MS } from './constants'
import { RAG_ERRORS } from './errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('rag/embedding-service')

export interface EmbeddingResult {
  vector: EmbeddingVector
  tokensUsed?: number
}

const EMBED_MAX_RETRIES = 3
const EMBED_RETRY_BASE_MS = 1000

/**
 * Exponential backoff helper.
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export class EmbeddingService {
  /**
   * Gera embedding para um único texto via OpenAI.
   * Retry com backoff exponencial (3 tentativas).
   * @throws Error se OPENAI_API_KEY não configurada ou todas as tentativas falharem
   */
  static async embed(text: string): Promise<EmbeddingResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(`[EmbeddingService] OPENAI_API_KEY não configurada. ${RAG_ERRORS.DIMENSION_MISMATCH.message}`)
    }

    const sanitized = text.trim().slice(0, 8000)
    if (!sanitized) {
      throw new Error('[EmbeddingService] Texto vazio não pode ser embeddado.')
    }

    let lastError: Error | undefined

    for (let attempt = 1; attempt <= EMBED_MAX_RETRIES; attempt++) {
      try {
        const res = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: sanitized,
            dimensions: RAG_EMBEDDING_DIMENSIONS,
          }),
        })

        if (!res.ok) {
          const body = await res.text()
          // 429 (rate limit) e 5xx são retryable; 4xx outros não
          const retryable = res.status === 429 || res.status >= 500
          if (!retryable) {
            throw new Error(`[EmbeddingService] OpenAI API error ${res.status}: ${body}`)
          }
          lastError = new Error(`[EmbeddingService] OpenAI API error ${res.status}: ${body}`)
          const backoff = EMBED_RETRY_BASE_MS * Math.pow(2, attempt - 1)
          log.warn({ attempt, maxRetries: EMBED_MAX_RETRIES, status: res.status, backoffMs: backoff }, '[EmbeddingService] Tentativa falhou (HTTP). Retry agendado.')
          await sleep(backoff)
          continue
        }

        const data = await res.json()
        const vector: number[] = data.data[0].embedding

        if (vector.length !== RAG_EMBEDDING_DIMENSIONS) {
          throw new Error(
            `[EmbeddingService] Dimension mismatch: expected ${RAG_EMBEDDING_DIMENSIONS}, got ${vector.length}`,
          )
        }

        return {
          vector,
          tokensUsed: data.usage?.total_tokens,
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('OpenAI API error 4')) {
          throw err // Não retryable
        }
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < EMBED_MAX_RETRIES) {
          const backoff = EMBED_RETRY_BASE_MS * Math.pow(2, attempt - 1)
          log.warn({ attempt, maxRetries: EMBED_MAX_RETRIES, backoffMs: backoff, err }, '[EmbeddingService] Tentativa falhou (exceção). Retry agendado.')
          await sleep(backoff)
        }
      }
    }

    throw lastError ?? new Error('[EmbeddingService] Falha ao gerar embedding após todas as tentativas.')
  }

  /**
   * Gera embedding com fallback silencioso.
   * Retorna null em caso de falha em vez de lançar exceção.
   * Usar quando o embedding é opcional (ex: busca semântica degradada).
   */
  static async embedWithFallback(text: string): Promise<EmbeddingResult | null> {
    try {
      return await this.embed(text)
    } catch (err) {
      log.error({ err }, '[EmbeddingService] Embedding falhou, retornando null (modo degradado)')
      return null
    }
  }

  /**
   * Gera embeddings em batch. Processa em lotes com throttle entre eles.
   */
  static async embedBatch(
    texts: string[],
    batchSize = RAG_EMBEDDING_BATCH_SIZE,
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = []

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map((t) => this.embed(t)))
      results.push(...batchResults)

      // Throttle entre batches para respeitar rate limits
      if (i + batchSize < texts.length) {
        await new Promise((r) => setTimeout(r, RAG_GITHUB_RATE_LIMIT_DELAY_MS))
      }
    }

    return results
  }

  /**
   * Verifica se o serviço de embedding está disponível (health check).
   * Retorna false sem lançar exceção se o serviço não responder.
   */
  static async isAvailable(): Promise<boolean> {
    try {
      if (!process.env.OPENAI_API_KEY) return false
      await this.embed('health check')
      return true
    } catch {
      return false
    }
  }
}
