import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { SessionService } from '@/lib/briefforge/session-service'
import { BriefSessionOrchestrator } from '@/lib/briefforge/session-orchestrator'
import { QuestionSelector, AIUnavailableError } from '@/lib/briefforge/question-selector'
import { SessionStateMachine } from '@/lib/briefforge/session-state-machine'
import { ContextBuilder } from '@/lib/briefforge/context-builder'
import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { UserRole } from '@prisma/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/briefs/questions')

// ─── POST .../questions — Registrar resposta e avançar sessão ─────────────────

const AnswerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z
    .string()
    .min(10, 'Resposta muito curta (mínimo 10 caracteres)')
    .max(2000, 'Resposta muito longa (máximo 2000 caracteres)')
    .trim(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
): Promise<Response> {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_001', message: 'Não autenticado.' } },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'VAL_001', message: 'Payload JSON inválido.' } },
      { status: 422 },
    )
  }

  const parsed = AnswerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VAL_001', message: 'Dados inválidos.', details: parsed.error.flatten() } },
      { status: 422 },
    )
  }

  try {
    // Fetch session to verify access and state
    const { sessionId } = await params
    const session = await SessionService.findById(sessionId)
    await withProjectAccess(user.id, session.brief.projectId, UserRole.PM)

    if (session.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: { code: 'BRIEF_084', message: 'Sessão não está ativa.' } },
        { status: 422 },
      )
    }

    // Persist the answer
    const now = new Date()
    await prisma.briefQuestion.update({
      where: { id: parsed.data.questionId },
      data: { answerText: parsed.data.answer, answeredAt: now },
    })

    // Re-fetch session with updated answer for state machine
    const updatedSession = await prisma.briefSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { questions: { orderBy: { order: 'asc' } } },
    })

    const sessionForMachine = {
      status: updatedSession.status as 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
      questions: updatedSession.questions,
    }

    // Check if session should be completed
    if (SessionStateMachine.shouldComplete(sessionForMachine)) {
      await SessionService.completeSession(sessionId, session.brief.projectId)
      return NextResponse.json({ data: { sessionStatus: 'COMPLETED' } })
    }

    // Still has questions — stream the next one via SSE
    const context = await ContextBuilder.build(sessionForMachine, session.brief.projectId)
    const nextOrder = updatedSession.questions.filter((q: { answerText: string | null }) => q.answerText !== null).length + 1

    // Create placeholder for next question (will be filled during SSE)
    const nextQuestion = await prisma.briefQuestion.create({
      data: {
        sessionId: sessionId,
        order: nextOrder,
        questionText: '', // Will be filled below
      },
    })

    const encoder = new TextEncoder()
    let fullText = ''
    let closed = false

    // Timer de segurança: fecha o stream após 2 minutos (geração de pergunta)
    let maxDurationTimer: ReturnType<typeof setTimeout> | null = null

    const stream = new ReadableStream({
      async start(controller) {
        maxDurationTimer = setTimeout(() => {
          closed = true
          try { controller.close() } catch { /* já fechado */ }
        }, 2 * 60 * 1000)

        try {
          for await (const chunk of QuestionSelector.selectNextStreaming(context)) {
            if (closed) break
            fullText += chunk
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`),
            )
          }

          if (!closed) {
            // Update question text with final content
            await prisma.briefQuestion.update({
              where: { id: nextQuestion.id },
              data: { questionText: fullText },
            })

            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          }
        } catch (err) {
          if (!closed) {
            // Stream error — clean up the placeholder question
            await prisma.briefQuestion.delete({ where: { id: nextQuestion.id } }).catch(() => {})
            if (err instanceof AIUnavailableError) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: 'AI service unavailable', degraded: true })}\n\n`,
                ),
              )
            }
          }
        } finally {
          if (maxDurationTimer) { clearTimeout(maxDurationTimer); maxDurationTimer = null }
          controller.close()
        }
      },
      cancel() {
        // Cliente desconectou — parar o loop na próxima iteração
        closed = true
        if (maxDurationTimer) { clearTimeout(maxDurationTimer); maxDurationTimer = null }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      return NextResponse.json(
        { error: { code: 'SYS_503', message: 'Serviço de IA temporariamente indisponível.', degraded: true } },
        { status: 503 },
      )
    }
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.statusCode },
      )
    }
    log.error({ err }, '[POST .../questions]')
    return NextResponse.json(
      { error: { code: 'SYS_500', message: 'Erro interno. Tente novamente.' } },
      { status: 500 },
    )
  }
}
