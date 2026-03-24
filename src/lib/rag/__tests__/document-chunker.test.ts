import { describe, it, expect } from 'vitest'
import { DocumentChunker } from '../document-chunker'
import { RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP, RAG_MIN_CHUNK_SIZE } from '../constants'

describe('DocumentChunker', () => {
  it('retorna array vazio para texto vazio', () => {
    expect(DocumentChunker.chunk('')).toEqual([])
    expect(DocumentChunker.chunk('   ')).toEqual([])
  })

  it('retorna chunk único para texto curto', () => {
    const text = 'Hello world, this is a short text.'
    const chunks = DocumentChunker.chunk(text)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].index).toBe(0)
    expect(chunks[0].charStart).toBe(0)
    expect(chunks[0].charEnd).toBe(text.length)
  })

  it('produz chunks de ~1000 chars para texto longo', () => {
    const text = 'A'.repeat(2500)
    const chunks = DocumentChunker.chunk(text)
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    chunks.forEach((c) => {
      expect(c.text.length).toBeLessThanOrEqual(RAG_CHUNK_SIZE + 10) // margem para separadores
      expect(c.text.length).toBeGreaterThanOrEqual(RAG_MIN_CHUNK_SIZE)
    })
  })

  it('aplica overlap entre chunks consecutivos', () => {
    const text = 'A'.repeat(2500)
    const chunks = DocumentChunker.chunk(text)
    if (chunks.length >= 2) {
      const overlap = chunks[0].charEnd - chunks[1].charStart
      // Overlap deve ser próximo de RAG_CHUNK_OVERLAP (200)
      expect(overlap).toBeGreaterThanOrEqual(RAG_CHUNK_OVERLAP - 50)
      expect(overlap).toBeLessThanOrEqual(RAG_CHUNK_OVERLAP + 50)
    }
  })

  it('respeita fronteira semântica \\n\\n', () => {
    const paragraph1 = 'A'.repeat(800)
    const paragraph2 = 'B'.repeat(800)
    const text = `${paragraph1}\n\n${paragraph2}`
    const chunks = DocumentChunker.chunk(text)
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    // O primeiro chunk deve terminar no \n\n
    expect(chunks[0].text).not.toContain('B')
  })

  it('aceita opções customizadas', () => {
    const text = 'A'.repeat(500)
    const chunks = DocumentChunker.chunk(text, { chunkSize: 200, overlap: 50, minChunkSize: 50 })
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((c) => {
      expect(c.text.length).toBeLessThanOrEqual(250) // margem
    })
  })

  it('indexa chunks sequencialmente a partir de 0', () => {
    const text = 'A'.repeat(3000)
    const chunks = DocumentChunker.chunk(text)
    chunks.forEach((c, i) => {
      expect(c.index).toBe(i)
    })
  })

  describe('estimateChunkCount', () => {
    it('retorna 1 para texto curto', () => {
      expect(DocumentChunker.estimateChunkCount(500)).toBe(1)
    })

    it('estima corretamente para texto longo', () => {
      const estimate = DocumentChunker.estimateChunkCount(2500)
      expect(estimate).toBeGreaterThanOrEqual(2)
      expect(estimate).toBeLessThanOrEqual(5)
    })
  })
})
