import { prisma } from '@/lib/db'
import { MAX_QUESTIONS } from './session-state-machine'
import type { AdaptiveQuestionContext } from '@/types/briefforge'

// ─── CONTEXT BUILDER ──────────────────────────────────────────────────────────

export class ContextBuilder {
  static readonly MAX_QUESTIONS = MAX_QUESTIONS

  /**
   * Busca dados do projeto e monta contexto para o QuestionSelector.
   */
  static async build(
    session: {
      questions: { questionText: string; answerText: string | null; order: number }[]
    },
    projectId: string,
  ): Promise<AdaptiveQuestionContext> {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { name: true, description: true },
    })

    const answeredQuestions = session.questions
      .filter(q => q.answerText !== null)
      .sort((a, b) => a.order - b.order)

    return {
      projectName: project.name,
      projectDescription: (project as { description?: string | null }).description ?? '',
      previousQA: answeredQuestions.map(q => ({
        question: q.questionText,
        answer: q.answerText!,
      })),
      questionNumber: answeredQuestions.length + 1,
      totalExpected: ContextBuilder.MAX_QUESTIONS,
    }
  }
}
