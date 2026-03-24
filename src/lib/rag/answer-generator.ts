/**
 * AnswerGenerator — geração de respostas via Claude CLI
 *
 * Usa o ClaudeCliProvider (module-2) para gerar respostas baseadas no contexto.
 * Quando não há contexto relevante, retorna mensagem padrão sem chamar a IA.
 */

import { ClaudeCliProvider } from '@/lib/ai/claude-cli-provider'
import { ContextAssembler } from './context-assembler'
import type { AssembledContext, GeneratedAnswer } from '@/types/rag'

const NO_CONTEXT_ANSWER =
  'Não tenho informações suficientes sobre isso nos documentos deste projeto. ' +
  'Tente indexar mais documentos ou reformule sua pergunta com mais detalhes.'

const provider = new ClaudeCliProvider()

export class AnswerGenerator {
  /**
   * Gera uma resposta completa (não-streaming) via Claude CLI.
   * Se não houver contexto, retorna mensagem padrão sem chamar a IA.
   */
  static async generate(
    query: string,
    context: AssembledContext,
  ): Promise<GeneratedAnswer> {
    const start = Date.now()

    // Sem contexto relevante → não chamar a IA para evitar alucinações
    if (!context.contextText) {
      return {
        answer: NO_CONTEXT_ANSWER,
        provider: 'none',
        hasContext: false,
        latencyMs: Date.now() - start,
      }
    }

    const prompt = ContextAssembler.buildPrompt(query, context)

    try {
      const answer = await provider.generate(prompt, {
        maxTokens: 2048,
        temperature: 0.3,
      })

      return {
        answer,
        provider: 'claude-cli',
        hasContext: true,
        latencyMs: Date.now() - start,
      }
    } catch (err) {
      throw new Error(
        `Failed to generate answer: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  /**
   * Gera resposta em streaming via Claude CLI AsyncGenerator.
   * Retorna um AsyncGenerator que emite tokens progressivamente.
   */
  static async *generateStream(
    query: string,
    context: AssembledContext,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<string> {
    if (!context.contextText) {
      yield NO_CONTEXT_ANSWER
      return
    }

    const prompt = ContextAssembler.buildPrompt(query, context)

    yield* provider.stream(prompt, {
      maxTokens: 2048,
      temperature: 0.3,
      abortSignal,
    })
  }

  /** Mensagem padrão para contexto insuficiente (acessível para testes) */
  static readonly NO_CONTEXT_ANSWER = NO_CONTEXT_ANSWER
}
