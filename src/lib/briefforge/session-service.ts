import { prisma } from '@/lib/db'
import { EventBus } from '@/lib/events/bus'
import { EventType } from '@/lib/constants/events'
import { createLogger } from '@/lib/logger'
import { BriefStatus, SessionStatus } from '@/types/briefforge'
import type { BriefSession, BriefQuestion } from '@/types/briefforge'
import { BriefNotFoundError } from './brief-service'
import { BriefSessionOrchestrator } from './session-orchestrator'
import { SessionStateMachine } from './session-state-machine'
import { AppError } from '@/lib/errors'

const log = createLogger('briefforge/session-service')

// ─── ERRORS ───────────────────────────────────────────────────────────────────

export class SessionActiveError extends AppError {
  constructor() {
    super('BRIEF_081', 'Já existe uma sessão ativa para este brief.', 409)
  }
}

export class BriefAlreadyCompletedError extends AppError {
  constructor() {
    super('BRIEF_082', 'Brief já foi concluído e não aceita novas sessões.', 422)
  }
}

export class SessionNotActiveError extends AppError {
  constructor() {
    super('BRIEF_084', 'Sessão não está ativa.', 422)
  }
}

// ─── SESSION SERVICE ──────────────────────────────────────────────────────────

export class SessionService {
  /**
   * Inicia uma nova sessão IA para o brief dado.
   * Gera a primeira pergunta via Claude CLI antes de retornar.
   */
  static async startSession(
    briefId: string,
    userId: string,
  ): Promise<{ session: BriefSession; firstQuestion: BriefQuestion; projectId: string }> {
    const brief = await prisma.brief.findUnique({
      where: { id: briefId },
      include: { sessions: { where: { status: 'ACTIVE' }, take: 1 } },
    })

    if (!brief) throw new BriefNotFoundError()
    if (brief.status === BriefStatus.COMPLETED) throw new BriefAlreadyCompletedError()
    if (brief.sessions.length > 0) throw new SessionActiveError()

    // Get project info for AI context
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: brief.projectId },
      select: { name: true, description: true },
    })

    // Generate first question via AI — do this BEFORE persisting session
    // so that if AI fails, no session is created (atomic operation)
    const firstQuestionText = await BriefSessionOrchestrator.generateFirstQuestion({
      name: project.name,
      description: (project as { description?: string | null }).description ?? '',
    })

    // Persist session + first question atomically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [session, firstQuestion] = await prisma.$transaction(async (tx: any) => {
      const newSession = await tx.briefSession.create({
        data: {
          briefId,
          status: 'ACTIVE',
        },
      })

      const question = await tx.briefQuestion.create({
        data: {
          sessionId: newSession.id,
          order: 1,
          questionText: firstQuestionText,
        },
      })

      await tx.brief.update({
        where: { id: briefId },
        data: { status: BriefStatus.IN_PROGRESS },
      })

      return [newSession, question]
    })

    // Publish event (fire-and-forget — does not break flow on failure)
    try {
      await EventBus.publish(
        EventType.BRIEF_SESSION_STARTED,
        brief.projectId,
        { sessionId: session.id, projectId: brief.projectId, userId },
      )
    } catch (err) {
      log.error({ err }, '[SessionService] Failed to publish BRIEF_SESSION_STARTED')
    }

    return {
      session: session as unknown as BriefSession,
      firstQuestion: firstQuestion as unknown as BriefQuestion,
      projectId: brief.projectId,
    }
  }

  /**
   * Busca sessão com suas perguntas ordenadas.
   */
  static async findById(sessionId: string): Promise<
    BriefSession & { questions: BriefQuestion[]; brief: { projectId: string } }
  > {
    const session = await prisma.briefSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        brief: { select: { projectId: true } },
      },
    })

    if (!session) {
      throw new AppError('BRIEF_084', 'Sessão não encontrada.', 404)
    }

    return session as unknown as BriefSession & { questions: BriefQuestion[]; brief: { projectId: string } }
  }

  /**
   * Registra resposta de uma pergunta e decide próximo passo.
   * Retorna { nextQuestion } se ainda há perguntas, ou { sessionCompleted: true } se finalizada.
   */
  static async answerQuestion(
    sessionId: string,
    questionId: string,
    answer: string,
  ): Promise<
    | { type: 'QUESTION'; nextQuestion: BriefQuestion; projectId: string }
    | { type: 'COMPLETE'; projectId: string; sessionId: string }
  > {
    const session = await prisma.briefSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        brief: { select: { id: true, projectId: true } },
      },
    })

    if (!session) throw new AppError('BRIEF_084', 'Sessão não encontrada.', 404)
    if (session.status !== 'ACTIVE') throw new SessionNotActiveError()

    const question = session.questions.find((q: { id: string }) => q.id === questionId)
    if (!question) throw new AppError('BRIEF_085', 'Pergunta não encontrada.', 404)

    // Persist answer
    const now = new Date()
    await prisma.briefQuestion.update({
      where: { id: questionId },
      data: { answerText: answer, answeredAt: now },
    })

    // Re-fetch session with updated answer
    const updatedSession = {
      status: session.status as SessionStatus,
      questions: session.questions.map((q: { id: string; answerText?: string | null }) =>
        q.id === questionId ? { ...q, answerText: answer } : q,
      ),
    }

    // Decide next step
    if (SessionStateMachine.shouldComplete(updatedSession)) {
      await SessionService.completeSession(sessionId, session.brief.projectId)
      return { type: 'COMPLETE', projectId: session.brief.projectId, sessionId }
    }

    // Generate next question via SSE (caller handles streaming)
    const decision = await BriefSessionOrchestrator.decideNext(
      updatedSession,
      session.brief.projectId,
    )

    if (decision.type === 'COMPLETE') {
      await SessionService.completeSession(sessionId, session.brief.projectId)
      return { type: 'COMPLETE', projectId: session.brief.projectId, sessionId }
    }

    // Persist next question placeholder (text will be filled during SSE)
    const nextQuestion = await prisma.briefQuestion.create({
      data: {
        sessionId,
        order: decision.order,
        questionText: decision.questionText,
      },
    })

    return {
      type: 'QUESTION',
      nextQuestion: nextQuestion as unknown as BriefQuestion,
      projectId: session.brief.projectId,
    }
  }

  static async completeSession(sessionId: string, projectId: string): Promise<void> {
    const now = new Date()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      const session = await tx.briefSession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', completedAt: now },
        include: { questions: { select: { id: true } } },
      })

      await tx.brief.update({
        where: { id: session.briefId },
        data: { status: BriefStatus.COMPLETED },
      })

      return session
    })

    try {
      await EventBus.publish(
        EventType.BRIEF_SESSION_COMPLETED,
        projectId,
        { sessionId, projectId },
      )
    } catch (err) {
      log.error({ err }, '[SessionService] Failed to publish BRIEF_SESSION_COMPLETED')
    }
  }

  static async cancelSession(sessionId: string, reason?: string): Promise<void> {
    const now = new Date()
    await prisma.briefSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED', cancelledAt: now },
    })
    console.info(`[SessionService] Session ${sessionId} cancelled. Reason: ${reason ?? 'unspecified'}`)
  }
}
