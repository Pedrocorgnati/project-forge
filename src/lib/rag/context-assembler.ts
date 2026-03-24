/**
 * ContextAssembler — monta contexto estruturado para o Claude CLI
 *
 * Recebe chunks da busca semântica e produz o prompt formatado
 * com separadores de documento e instrução de citação de fontes.
 */

import type { SearchResult, AssembledContext, SourceDoc } from '@/types/rag'

const MAX_CONTEXT_CHARS = 12_000 // ~3k tokens de contexto
const EXCERPT_LENGTH = 150

export class ContextAssembler {
  /**
   * Monta o contexto a partir dos resultados de busca.
   * Deduplica por documentId+chunkIndex e respeita o limite de caracteres.
   */
  static assemble(searchResults: SearchResult[]): AssembledContext {
    if (searchResults.length === 0) {
      return { contextText: '', sourceDocs: [] }
    }

    // Deduplica por documentId+chunkIndex
    const unique = Array.from(
      new Map(
        searchResults.map((r) => [`${r.documentId}:${r.chunkIndex}`, r]),
      ).values(),
    )

    const sections: string[] = []
    const sourceDocs: SourceDoc[] = []
    let totalChars = 0

    for (const result of unique) {
      const section = `--- Documento: ${result.documentTitle} ---\n${result.chunkText}`
      if (totalChars + section.length > MAX_CONTEXT_CHARS) {
        break
      }
      sections.push(section)
      totalChars += section.length

      sourceDocs.push({
        documentTitle: result.documentTitle,
        documentId: result.documentId,
        chunkIndex: result.chunkIndex,
        excerpt:
          result.chunkText.slice(0, EXCERPT_LENGTH).trim() +
          (result.chunkText.length > EXCERPT_LENGTH ? '...' : ''),
      })
    }

    return {
      contextText: sections.join('\n\n'),
      sourceDocs,
    }
  }

  /** Monta o prompt completo para o Claude CLI */
  static buildPrompt(query: string, context: AssembledContext): string {
    const systemPart = [
      'Você é o HandoffAI, assistente especializado em responder perguntas sobre projetos de software.',
      'Responda APENAS com base nos documentos de contexto fornecidos.',
      'Se não houver informação suficiente nos documentos, responda exatamente: "Não tenho informações suficientes sobre isso nos documentos deste projeto."',
      'Ao citar informações, referencie a fonte usando [Documento: {título}].',
      'Responda em português do Brasil.',
    ].join('\n')

    if (!context.contextText) {
      return `${systemPart}\n\nNenhum documento relevante encontrado. Responda com a mensagem padrão de falta de informação.`
    }

    return [
      systemPart,
      '',
      'CONTEXTO DOS DOCUMENTOS:',
      context.contextText,
      '',
      `PERGUNTA: ${query}`,
    ].join('\n')
  }
}
