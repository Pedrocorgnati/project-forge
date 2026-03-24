import { SessionStatus } from '@/types/briefforge'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

export const MAX_QUESTIONS = 7

// ─── STATE MACHINE ────────────────────────────────────────────────────────────

export class SessionStateMachine {
  /**
   * Verifica se a sessão pode continuar (receber mais perguntas).
   * Retorna false se: sessão não está ACTIVE, ou atingiu MAX_QUESTIONS.
   */
  static canContinue(session: {
    status: SessionStatus
    questions: { answerText: string | null }[]
  }): boolean {
    if (session.status !== 'ACTIVE') return false
    const answeredCount = session.questions.filter(q => q.answerText !== null).length
    return answeredCount < MAX_QUESTIONS
  }

  /**
   * Determina se a sessão deve ser marcada como COMPLETED.
   * Critério: todas as perguntas esperadas foram respondidas.
   */
  static shouldComplete(session: {
    questions: { answerText: string | null }[]
  }): boolean {
    const answeredCount = session.questions.filter(q => q.answerText !== null).length
    return answeredCount >= MAX_QUESTIONS
  }

  /**
   * Valida transição de estado.
   * ACTIVE → COMPLETED: válido
   * ACTIVE → CANCELLED: válido
   * COMPLETED/CANCELLED → qualquer: inválido (lança InvalidTransitionError)
   */
  static assertTransition(from: SessionStatus, to: SessionStatus): void {
    const valid: Record<SessionStatus, SessionStatus[]> = {
      ACTIVE: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    }
    if (!valid[from].includes(to)) {
      throw new InvalidTransitionError(`Transição inválida de sessão: ${from} → ${to}`)
    }
  }
}

export class InvalidTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidTransitionError'
  }
}
