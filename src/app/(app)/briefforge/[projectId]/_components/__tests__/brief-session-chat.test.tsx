// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import {
  createBriefFixture,
  createSessionFixture,
  createQuestionFixture,
  createAnsweredQuestion,
} from '@/lib/briefforge/__tests__/fixtures'
import { BriefSessionChat } from '../brief-session-chat'

// ─── Polyfills jsdom ────────────────────────────────────────────────────────────

// scrollIntoView não existe no jsdom
Element.prototype.scrollIntoView = vi.fn()

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const mockRouterRefresh = vi.fn()
const mockRouterPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRouterRefresh,
    push: mockRouterPush,
  }),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('lucide-react', () => ({
  Send: (props: Record<string, unknown>) => <svg data-testid="send-icon" {...props} />,
  Bot: (props: Record<string, unknown>) => <svg data-testid="bot-icon" {...props} />,
}))

// Mock StreamingText usado pelo QuestionCard
vi.mock('@/components/ui/streaming-text', () => ({
  StreamingText: ({ content, className }: { content: string; className?: string }) => (
    <p className={className}>{content}</p>
  ),
}))

// Mock Badge usado pelo SessionProgress
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

// ─── Helpers ───────────────────────────────────────────────────────────────────

let fetchMock: ReturnType<typeof vi.fn>

function mockFetchResponse(status: number, data: unknown, options?: { contentType?: string }) {
  const contentType = options?.contentType ?? 'application/json'
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key: string) => key.toLowerCase() === 'content-type' ? contentType : null,
    },
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  })
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('BriefSessionChat', () => {
  const projectId = 'proj_test_001'

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('brief DRAFT sem sessão → botão "Iniciar Entrevista" visível', () => {
    const brief = createBriefFixture({ status: 'DRAFT', sessions: [] })

    render(
      <BriefSessionChat
        brief={brief}
        projectId={projectId}
      />,
    )

    expect(screen.getByTestId('briefforge-start-button')).toBeInTheDocument()
    expect(screen.getByText('Iniciar Entrevista')).toBeInTheDocument()
  })

  it('clicar "Iniciar Entrevista" → fetch POST chamado, primeira pergunta exibida', async () => {
    const user = userEvent.setup()
    const brief = createBriefFixture({ status: 'DRAFT', sessions: [] })

    const firstQuestion = createQuestionFixture(1, {
      questionText: 'Qual é o objetivo principal do projeto?',
    })
    const session = createSessionFixture({ status: 'ACTIVE' })

    fetchMock.mockReturnValueOnce(
      mockFetchResponse(201, {
        data: {
          session: { id: session.id, briefId: brief.id, status: 'ACTIVE' },
          firstQuestion,
        },
      }),
    )

    render(
      <BriefSessionChat
        brief={brief}
        projectId={projectId}

      />,
    )

    const startBtn = screen.getByTestId('briefforge-start-button')
    await user.click(startBtn)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/briefs/${brief.id}/sessions`,
        expect.objectContaining({ method: 'POST' }),
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Qual é o objetivo principal do projeto?')).toBeInTheDocument()
    })
  })

  it('brief IN_PROGRESS com sessão ACTIVE e questions → chat exibe histórico', () => {
    const q1 = createAnsweredQuestion(1, 'Criar plataforma de gestão')
    const q2 = createQuestionFixture(2, {
      questionText: 'Qual é o prazo desejado?',
    })

    const session = createSessionFixture({
      status: 'ACTIVE',
      questions: [
        { ...q1, questionText: 'Qual é o objetivo do projeto?' },
        q2,
      ],
    })

    const brief = createBriefFixture({
      status: 'IN_PROGRESS',
      sessions: [session],
    })

    render(
      <BriefSessionChat
        brief={brief}
        projectId={projectId}

      />,
    )

    // Histórico: pergunta 1 + resposta 1 + pergunta 2
    expect(screen.getByText('Qual é o objetivo do projeto?')).toBeInTheDocument()
    expect(screen.getByText('Criar plataforma de gestão')).toBeInTheDocument()
    expect(screen.getByText('Qual é o prazo desejado?')).toBeInTheDocument()

    // Botão de iniciar não deve aparecer (já tem sessão)
    expect(screen.queryByTestId('briefforge-start-button')).not.toBeInTheDocument()
  })

  it('SessionStatus COMPLETED → mensagem de conclusão visível', () => {
    const q1 = createAnsweredQuestion(1, 'Resposta final')

    const session = createSessionFixture({
      status: 'COMPLETED',
      completedAt: new Date(),
      questions: [{ ...q1, questionText: 'Última pergunta?' }],
    })

    const brief = createBriefFixture({
      status: 'COMPLETED',
      sessions: [session],
    })

    render(
      <BriefSessionChat
        brief={brief}
        projectId={projectId}

      />,
    )

    expect(screen.getByText('Briefing concluído! Todas as perguntas foram respondidas.')).toBeInTheDocument()
    expect(screen.getByText('O resumo será carregado automaticamente.')).toBeInTheDocument()
  })

  it('API retorna 503 degraded → DegradedBanner visível', async () => {
    const user = userEvent.setup()
    const brief = createBriefFixture({ status: 'DRAFT', sessions: [] })

    fetchMock.mockReturnValueOnce(
      mockFetchResponse(503, {
        error: { degraded: true, message: 'IA temporariamente indisponível' },
      }),
    )

    render(
      <BriefSessionChat
        brief={brief}
        projectId={projectId}

      />,
    )

    const startBtn = screen.getByTestId('briefforge-start-button')
    await user.click(startBtn)

    await waitFor(() => {
      // DegradedBanner has role="alert" with aria-label containing "modo degradado"
      const banner = screen.getByRole('alert', { name: /modo degradado/i })
      expect(banner).toBeInTheDocument()
    })
  })
})
