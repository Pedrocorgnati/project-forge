import { QuestionSelector } from './question-selector'
import { ContextBuilder } from './context-builder'
import { SessionStateMachine } from './session-state-machine'
import type { SessionStatus } from '@/types/briefforge'

// ─── SESSION ORCHESTRATOR ─────────────────────────────────────────────────────

interface SessionWithQuestions {
  status: SessionStatus
  questions: {
    questionText: string
    answerText: string | null
    order: number
  }[]
}

export class BriefSessionOrchestrator {
  /**
   * Decide o próximo passo após uma resposta ser registrada.
   * Retorna 'QUESTION' com o texto gerado, ou 'COMPLETE' quando critério atingido.
   */
  static async decideNext(
    session: SessionWithQuestions,
    projectId: string,
  ): Promise<
    | { type: 'QUESTION'; questionText: string; order: number }
    | { type: 'COMPLETE'; reason: string }
  > {
    if (!SessionStateMachine.canContinue(session)) {
      const reason =
        session.status !== 'ACTIVE' ? 'session_cancelled_or_completed' : 'max_questions_reached'
      return { type: 'COMPLETE', reason }
    }

    const context = await ContextBuilder.build(session, projectId)
    const questionText = await QuestionSelector.selectNext(context)
    const nextOrder = session.questions.filter(q => q.answerText !== null).length + 1

    return { type: 'QUESTION', questionText, order: nextOrder }
  }

  /**
   * Gera a primeira pergunta para uma sessão recém-criada.
   */
  static async generateFirstQuestion(
    projectContext: { name: string; description: string },
  ): Promise<string> {
    return QuestionSelector.generateFirstQuestion(projectContext)
  }

  /**
   * Retorna um AsyncGenerator de chunks da próxima pergunta via SSE.
   */
  static async *decideNextStreaming(
    session: SessionWithQuestions,
    projectId: string,
  ): AsyncGenerator<string> {
    if (!SessionStateMachine.canContinue(session)) return
    const context = await ContextBuilder.build(session, projectId)
    yield* QuestionSelector.selectNextStreaming(context)
  }
}
