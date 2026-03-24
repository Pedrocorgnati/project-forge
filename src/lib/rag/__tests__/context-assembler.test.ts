import { describe, it, expect } from 'vitest'
import { ContextAssembler } from '../context-assembler'
import type { SearchResult } from '@/types/rag'

const mockResults: SearchResult[] = [
  {
    embeddingId: 'emb-1',
    documentId: 'doc-1',
    documentTitle: 'README.md',
    chunkIndex: 0,
    chunkText: 'Este projeto usa Next.js 14 com App Router.',
    similarity: 0.95,
  },
  {
    embeddingId: 'emb-2',
    documentId: 'doc-2',
    documentTitle: 'PRD.md',
    chunkIndex: 2,
    chunkText: 'O sistema deve suportar autenticação via Supabase Auth.',
    similarity: 0.88,
  },
]

describe('ContextAssembler', () => {
  it('inclui separadores de documento no contextText', () => {
    const { contextText } = ContextAssembler.assemble(mockResults)
    expect(contextText).toContain('--- Documento: README.md ---')
    expect(contextText).toContain('--- Documento: PRD.md ---')
  })

  it('retorna sourceDocs com excerpt dos chunks', () => {
    const { sourceDocs } = ContextAssembler.assemble(mockResults)
    expect(sourceDocs).toHaveLength(2)
    expect(sourceDocs[0].documentTitle).toBe('README.md')
    expect(sourceDocs[0].excerpt).toContain('Next.js')
  })

  it('retorna contextText e sourceDocs vazios para array vazio', () => {
    const result = ContextAssembler.assemble([])
    expect(result.contextText).toBe('')
    expect(result.sourceDocs).toEqual([])
  })

  it('buildPrompt inclui instrução de citação de fontes', () => {
    const context = ContextAssembler.assemble(mockResults)
    const prompt = ContextAssembler.buildPrompt('Qual o stack?', context)
    expect(prompt).toContain('[Documento:')
    expect(prompt).toContain('PERGUNTA: Qual o stack?')
    expect(prompt).toContain('CONTEXTO DOS DOCUMENTOS:')
  })

  it('buildPrompt sem contexto retorna instrução de falta de informação', () => {
    const emptyContext = ContextAssembler.assemble([])
    const prompt = ContextAssembler.buildPrompt('query', emptyContext)
    expect(prompt).toContain('mensagem padrão de falta de informação')
  })

  it('deduplica chunks com mesmo documentId+chunkIndex', () => {
    const duplicated: SearchResult[] = [
      { ...mockResults[0] },
      { ...mockResults[0], embeddingId: 'emb-dup' },
    ]
    const { sourceDocs } = ContextAssembler.assemble(duplicated)
    expect(sourceDocs).toHaveLength(1)
  })
})
