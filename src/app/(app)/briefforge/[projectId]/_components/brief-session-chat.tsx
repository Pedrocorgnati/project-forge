'use client'

// RESOLVED: useReducer refactor — 9 useState → consolidated ChatState (G05)
import { useReducer, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { DegradedBanner } from '@/components/ui/degraded-banner'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { MAX_QUESTIONS } from '@/lib/briefforge/session-state-machine'
import { TIMING } from '@/lib/constants/timing'
import type { Brief, BriefSession, BriefQuestion, SessionStatus } from '@/types/briefforge'
import { QuestionCard } from './question-card'
import { AnswerInput } from './answer-input'
import { SessionProgress } from './session-progress'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'ai' | 'user'
  content: string
  order?: number
  streaming?: boolean
}

type ChatStatus = 'idle' | 'starting' | 'submitting' | 'streaming'

interface ChatState {
  messages: ChatMessage[]
  currentSession: { id: string; status: SessionStatus } | null
  currentQuestionId: string | null
  status: ChatStatus
  isDegraded: boolean
  answeredCount: number
  sessionCompleted: boolean
}

type ChatAction =
  | { type: 'START' }
  | { type: 'SESSION_STARTED'; session: { id: string; status: SessionStatus }; firstQuestion: BriefQuestion }
  | { type: 'SESSION_START_FAILED' }
  | { type: 'ADD_USER_MSG'; msgId: string; content: string }
  | { type: 'REMOVE_MSG'; msgId: string }
  | { type: 'SESSION_COMPLETED' }
  | { type: 'STREAMING_START'; streamingMsgId: string }
  | { type: 'STREAMING_CHUNK'; streamingMsgId: string; fullText: string }
  | { type: 'STREAMING_END'; streamingMsgId: string; fullText: string; newQuestionId: string | null }
  | { type: 'SET_QUESTION'; questionId: string }
  | { type: 'SET_DEGRADED'; value: boolean }
  | { type: 'SUBMIT_FAILED' }
  | { type: 'RESTORE'; messages: ChatMessage[]; session: { id: string; status: SessionStatus }; answeredCount: number; currentQuestionId: string | null; sessionCompleted: boolean }

const initialState: ChatState = {
  messages: [],
  currentSession: null,
  currentQuestionId: null,
  status: 'idle',
  isDegraded: false,
  answeredCount: 0,
  sessionCompleted: false,
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'START':
      return { ...state, status: 'starting' }
    case 'SESSION_STARTED':
      return {
        ...state,
        status: 'idle',
        currentSession: action.session,
        currentQuestionId: action.firstQuestion.id,
        messages: [{
          id: `q-${action.firstQuestion.id}`,
          role: 'ai',
          content: action.firstQuestion.questionText,
          order: action.firstQuestion.order,
        }],
      }
    case 'SESSION_START_FAILED':
      return { ...state, status: 'idle' }
    case 'ADD_USER_MSG':
      return {
        ...state,
        status: 'submitting',
        messages: [...state.messages, { id: action.msgId, role: 'user', content: action.content }],
      }
    case 'REMOVE_MSG':
      return { ...state, status: 'idle', messages: state.messages.filter((m) => m.id !== action.msgId) }
    case 'SESSION_COMPLETED':
      return {
        ...state,
        status: 'idle',
        sessionCompleted: true,
        answeredCount: state.answeredCount + 1,
        currentSession: state.currentSession ? { ...state.currentSession, status: 'COMPLETED' } : null,
      }
    case 'STREAMING_START':
      return {
        ...state,
        status: 'streaming',
        answeredCount: state.answeredCount + 1,
        messages: [...state.messages, { id: action.streamingMsgId, role: 'ai', content: '', streaming: true }],
      }
    case 'STREAMING_CHUNK':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.streamingMsgId ? { ...m, content: action.fullText } : m
        ),
      }
    case 'STREAMING_END':
      return {
        ...state,
        status: 'idle',
        currentQuestionId: action.newQuestionId ?? state.currentQuestionId,
        messages: state.messages.map((m) =>
          m.id === action.streamingMsgId ? { ...m, streaming: false, content: action.fullText } : m
        ),
      }
    case 'SET_QUESTION':
      return { ...state, currentQuestionId: action.questionId }
    case 'SET_DEGRADED':
      return { ...state, isDegraded: action.value }
    case 'SUBMIT_FAILED':
      return { ...state, status: 'idle' }
    case 'RESTORE':
      return {
        ...state,
        messages: action.messages,
        currentSession: action.session,
        answeredCount: action.answeredCount,
        currentQuestionId: action.currentQuestionId,
        sessionCompleted: action.sessionCompleted,
      }
    default:
      return state
  }
}

interface BriefSessionChatProps {
  brief: Brief
  projectId: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BriefSessionChat({ brief, projectId }: BriefSessionChatProps) {
  const router = useRouter()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const { messages, currentSession, currentQuestionId, status, isDegraded, answeredCount, sessionCompleted } = state

  const isStarting = status === 'starting'
  const isSubmitting = status === 'submitting'
  const isStreaming = status === 'streaming'

  // ── Scroll automático ────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // ── Carregar sessão existente ao montar ──────────────────────────────────
  useEffect(() => {
    const lastSession = brief.sessions?.[0]
    if (!lastSession) return

    if (lastSession.questions && lastSession.questions.length > 0) {
      const sortedQuestions = [...lastSession.questions].sort((a, b) => a.order - b.order)
      const restored: ChatMessage[] = []
      let answered = 0
      let lastQuestionId: string | null = null

      for (const q of sortedQuestions) {
        if (q.questionText) {
          restored.push({ id: `q-${q.id}`, role: 'ai', content: q.questionText, order: q.order })
        }
        if (q.answerText) {
          restored.push({ id: `a-${q.id}`, role: 'user', content: q.answerText })
          answered++
        } else {
          lastQuestionId = q.id
        }
      }

      dispatch({
        type: 'RESTORE',
        messages: restored,
        session: { id: lastSession.id, status: lastSession.status },
        answeredCount: answered,
        currentQuestionId: lastQuestionId,
        sessionCompleted: lastSession.status === 'COMPLETED',
      })
    } else {
      dispatch({
        type: 'RESTORE',
        messages: [],
        session: { id: lastSession.id, status: lastSession.status },
        answeredCount: 0,
        currentQuestionId: null,
        sessionCompleted: lastSession.status === 'COMPLETED',
      })
    }
  }, [brief])

  // ── Iniciar nova sessão ──────────────────────────────────────────────────
  async function handleStartSession() {
    if (isStarting || currentSession) return
    dispatch({ type: 'START' })

    try {
      const res = await fetch(`/api/briefs/${brief.id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        if (res.status === 503 && body?.error?.degraded) {
          dispatch({ type: 'SET_DEGRADED', value: true })
          toast.warning('IA temporariamente indisponível. Tente novamente em alguns minutos.')
        } else {
          toast.error(body?.error?.message ?? 'Erro ao iniciar sessão.')
        }
        dispatch({ type: 'SESSION_START_FAILED' })
        return
      }

      const { data } = await res.json()
      const { session, firstQuestion } = data as { session: BriefSession; firstQuestion: BriefQuestion }
      dispatch({ type: 'SESSION_STARTED', session: { id: session.id, status: 'ACTIVE' }, firstQuestion })
    } catch {
      toast.error('Erro de conexão ao iniciar sessão.')
      dispatch({ type: 'SESSION_START_FAILED' })
    }
  }

  // ── Enviar resposta ──────────────────────────────────────────────────────
  async function handleSubmitAnswer(answer: string) {
    if (!currentSession || !currentQuestionId || isSubmitting || isStreaming) return

    const userMsgId = `user-${Date.now()}`
    dispatch({ type: 'ADD_USER_MSG', msgId: userMsgId, content: answer })

    try {
      const res = await fetch(
        `/api/briefs/${brief.id}/sessions/${currentSession.id}/questions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: currentQuestionId, answer }),
        },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        if (res.status === 503 && body?.error?.degraded) {
          dispatch({ type: 'SET_DEGRADED', value: true })
          toast.warning('IA temporariamente indisponível. Sua resposta foi salva.')
          dispatch({ type: 'SUBMIT_FAILED' })
        } else {
          toast.error(body?.error?.message ?? 'Erro ao enviar resposta.')
          dispatch({ type: 'REMOVE_MSG', msgId: userMsgId })
        }
        return
      }

      const contentType = res.headers.get('Content-Type') ?? ''

      // ── JSON response: sessão concluída ──────────────────────────────
      if (contentType.includes('application/json')) {
        const body = await res.json()
        if (body.data?.sessionStatus === 'COMPLETED') {
          dispatch({ type: 'SESSION_COMPLETED' })
          toast.success('Briefing concluído com sucesso!')
          setTimeout(() => router.refresh(), TIMING.REFRESH_DELAY_MS)
        } else {
          dispatch({ type: 'SUBMIT_FAILED' })
        }
        return
      }

      // ── SSE response: streaming da próxima pergunta ──────────────────
      const streamingMsgId = `streaming-${Date.now()}`
      dispatch({ type: 'STREAMING_START', streamingMsgId })

      const reader = res.body?.getReader()
      if (!reader) {
        toast.error('Erro ao ler resposta da IA.')
        dispatch({ type: 'SUBMIT_FAILED' })
        return
      }

      const decoder = new TextDecoder()
      let fullText = ''
      let newQuestionId: string | null = null
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') continue

          try {
            const parsed = JSON.parse(payload)
            if (parsed.error && parsed.degraded) {
              dispatch({ type: 'SET_DEGRADED', value: true })
              toast.warning('IA temporariamente indisponível.')
              break
            }
            if (parsed.chunk) {
              fullText += parsed.chunk
              dispatch({ type: 'STREAMING_CHUNK', streamingMsgId, fullText })
            }
            if (parsed.questionId) {
              newQuestionId = parsed.questionId
            }
          } catch {
            // Ignorar linhas que não são JSON válido
          }
        }
      }

      dispatch({ type: 'STREAMING_END', streamingMsgId, fullText, newQuestionId })

      // Fallback: buscar questionId se não veio no stream
      if (!newQuestionId) {
        try {
          const refreshRes = await fetch(
            `/api/briefs/${brief.id}/sessions/${currentSession.id}/questions`,
            { method: 'GET' },
          ).catch(() => null)

          if (!refreshRes || !refreshRes.ok) {
            const { getBriefByProject } = await import('@/actions/briefforge')
            const result = await getBriefByProject(projectId)
            if ('data' in result && result.data?.sessions?.[0]?.questions) {
              const questions = result.data.sessions[0].questions
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const lastUnanswered = questions.find((q: any) => !q.answerText)
              if (lastUnanswered) {
                dispatch({ type: 'SET_QUESTION', questionId: lastUnanswered.id })
              }
            }
          }
        } catch {
          // Se falhar, o usuário pode dar refresh
        }
      }
    } catch {
      toast.error('Erro de conexão ao enviar resposta.')
      dispatch({ type: 'REMOVE_MSG', msgId: userMsgId })
    }
  }

  // ── Estado: sem sessão iniciada ──────────────────────────────────────────
  const needsSessionStart = !currentSession && messages.length === 0

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Banner de modo degradado — auto-retry em 60s */}
      {isDegraded && (
        <DegradedBanner
          module="BRIEFFORGE"
          retryAfterMs={60_000}
          onRetry={() => dispatch({ type: 'SET_DEGRADED', value: false })}
          onDismiss={() => dispatch({ type: 'SET_DEGRADED', value: false })}
        />
      )}

      {/* Progress bar */}
      <SessionProgress
        answeredCount={answeredCount}
        totalExpected={MAX_QUESTIONS}
        status={
          sessionCompleted
            ? 'COMPLETED'
            : currentSession
              ? currentSession.status
              : 'NOT_STARTED'
        }
      />

      {/* Área de mensagens */}
      <div
        data-testid="briefforge-chat"
        className="space-y-3 min-h-[200px]"
        aria-live="polite"
        aria-label="Conversa de briefing"
      >
        {needsSessionStart && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Clique para iniciar a entrevista de briefing com a IA.
            </p>
            <Button
              variant="primary"
              size="md"
              loading={isStarting}
              onClick={handleStartSession}
              data-testid="briefforge-start-button"
            >
              Iniciar Entrevista
            </Button>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === 'ai' ? (
            <QuestionCard
              key={msg.id}
              text={msg.content}
              streaming={msg.streaming}
              order={msg.order}
            />
          ) : (
            <div key={msg.id} className="flex gap-3 flex-row-reverse">
              <Card
                variant="default"
                className="bg-brand-light dark:bg-brand/10 border-brand/20 dark:border-brand/20"
              >
                <CardContent className="p-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {msg.content}
                  </p>
                </CardContent>
              </Card>
            </div>
          ),
        )}

        {/* Mensagem de conclusão */}
        {sessionCompleted && (
          <div className="flex gap-3">
            <div
              className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <Card variant="default" className="bg-green-50 dark:bg-green-500/10 border-green-200/50 dark:border-green-500/20 flex-1">
              <CardContent className="p-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Briefing concluído! Todas as perguntas foram respondidas.
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  O resumo será carregado automaticamente.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input de resposta */}
      {!sessionCompleted && !needsSessionStart && (
        <AnswerInput
          onSubmit={handleSubmitAnswer}
          isLoading={isSubmitting || isStreaming}
          disabled={sessionCompleted || isDegraded}
        />
      )}
    </div>
  )
}

