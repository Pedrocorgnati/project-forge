/**
 * DocumentChunker — divide texto em chunks com overlap configurável
 *
 * Estratégia de chunking:
 * - Tamanho padrão: 1000 chars
 * - Overlap: 200 chars (últimos 200 do chunk N são os primeiros 200 do N+1)
 * - Separadores preferidos: \n\n, \n, ". " (respeita fronteiras semânticas)
 * - Chunk mínimo: 100 chars (descarta menores)
 */

import { RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP, RAG_MIN_CHUNK_SIZE } from './constants'

export interface Chunk {
  index: number
  text: string
  charStart: number
  charEnd: number
}

export interface ChunkOptions {
  chunkSize?: number
  overlap?: number
  minChunkSize?: number
}

export class DocumentChunker {
  private static readonly SEPARATORS = ['\n\n', '\n', '. ', ' ']

  /**
   * Divide texto em chunks com overlap.
   * Retorna array vazio para texto vazio/whitespace-only.
   */
  static chunk(text: string, options: ChunkOptions = {}): Chunk[] {
    const chunkSize = options.chunkSize ?? RAG_CHUNK_SIZE
    const overlap = options.overlap ?? RAG_CHUNK_OVERLAP
    const minChunk = options.minChunkSize ?? RAG_MIN_CHUNK_SIZE

    if (!text || text.trim().length === 0) return []

    if (text.length <= chunkSize) {
      return [{ index: 0, text: text.trim(), charStart: 0, charEnd: text.length }]
    }

    const chunks: Chunk[] = []
    let start = 0
    let index = 0

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length)
      let splitAt = end

      // Tentar quebrar em fronteira semântica dentro da janela
      if (end < text.length) {
        for (const sep of this.SEPARATORS) {
          const lastSep = text.lastIndexOf(sep, end)
          if (lastSep > start + minChunk) {
            splitAt = lastSep + sep.length
            break
          }
        }
      }

      const chunkText = text.slice(start, splitAt).trim()
      if (chunkText.length >= minChunk) {
        chunks.push({ index, text: chunkText, charStart: start, charEnd: splitAt })
        index++
      }

      // Próximo chunk começa com overlap
      const prevStart = start
      start = splitAt - overlap
      if (start <= prevStart || start >= text.length) break
    }

    return chunks
  }

  /** Estima número de chunks sem executar o chunking completo */
  static estimateChunkCount(
    textLength: number,
    chunkSize = RAG_CHUNK_SIZE,
    overlap = RAG_CHUNK_OVERLAP,
  ): number {
    if (textLength <= chunkSize) return 1
    return Math.ceil((textLength - overlap) / (chunkSize - overlap))
  }
}
