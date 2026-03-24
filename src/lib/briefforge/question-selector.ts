import { ClaudeCliProvider } from '@/lib/ai/claude-cli-provider'
import type { AdaptiveQuestionContext } from '@/types/briefforge'

// ─── ERRORS ───────────────────────────────────────────────────────────────────

export class AIUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AIUnavailableError'
  }
}

// ─── QUESTION SELECTOR ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
Você é um consultor especialista em requisitos de software.
Sua tarefa é conduzir uma entrevista estruturada para entender o escopo
de um projeto de software. Faça UMA pergunta por vez, adaptando-se
às respostas anteriores. Foque em: objetivos de negócio, usuários-alvo,
funcionalidades essenciais, restrições técnicas e critérios de sucesso.
Seja conciso e direto. Nunca repita perguntas já feitas.
`.trim()

export class QuestionSelector {
  private static readonly provider = new ClaudeCliProvider()

  /**
   * Gera próxima pergunta adaptativa via Claude CLI.
   * Lança AIUnavailableError se Claude CLI não responder.
   */
  static async selectNext(context: AdaptiveQuestionContext): Promise<string> {
    const prompt = QuestionSelector.buildPrompt(context)

    try {
      const response = await QuestionSelector.provider.generate(prompt, {
        maxTokens: 256,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
      })
      if (!response?.trim()) {
        throw new AIUnavailableError('Claude CLI retornou resposta vazia')
      }
      return response.trim()
    } catch (err) {
      if (err instanceof AIUnavailableError) throw err
      throw new AIUnavailableError('Claude CLI indisponível para geração de pergunta', { cause: err })
    }
  }

  /**
   * Gera pergunta via streaming — retorna AsyncGenerator de chunks de texto.
   * Usado pelo endpoint SSE.
   */
  static async *selectNextStreaming(context: AdaptiveQuestionContext): AsyncGenerator<string> {
    const prompt = QuestionSelector.buildPrompt(context)

    try {
      yield* QuestionSelector.provider.stream(prompt, {
        system: SYSTEM_PROMPT,
        maxTokens: 256,
      })
    } catch (err) {
      throw new AIUnavailableError('Claude CLI indisponível para streaming de pergunta', { cause: err })
    }
  }

  /**
   * Gera primeira pergunta de abertura para uma sessão nova.
   */
  static async generateFirstQuestion(projectContext: {
    name: string
    description: string
  }): Promise<string> {
    const openingContext: AdaptiveQuestionContext = {
      projectName: projectContext.name,
      projectDescription: projectContext.description,
      previousQA: [],
      questionNumber: 1,
      totalExpected: 7,
    }
    return QuestionSelector.selectNext(openingContext)
  }

  static buildPrompt(context: AdaptiveQuestionContext): string {
    const qaHistory = context.previousQA
      .map((qa, i) => `P${i + 1}: ${qa.question}\nR${i + 1}: ${qa.answer}`)
      .join('\n\n')

    return [
      `Projeto: ${context.projectName}`,
      context.projectDescription ? `Descrição: ${context.projectDescription}` : '',
      context.previousQA.length > 0 ? `\nHistórico da entrevista:\n${qaHistory}` : '',
      `\nEsta é a pergunta número ${context.questionNumber} de aproximadamente ${context.totalExpected}.`,
      'Gere a próxima pergunta mais relevante para entender o escopo do projeto.',
    ]
      .filter(Boolean)
      .join('\n')
  }
}
