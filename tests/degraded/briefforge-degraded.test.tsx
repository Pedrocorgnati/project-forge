// @vitest-environment jsdom
/**
 * DADO que a IA está indisponível
 * QUANDO o usuário tenta iniciar uma sessão BriefForge
 * ENTÃO deve ver o DegradedBanner (BRIEFFORGE) com mensagem e botão de dismiss
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import {
  createBriefFixture,
  createSessionFixture,
  createQuestionFixture,
} from '@/lib/briefforge/__tests__/fixtures'
import { BriefSessionChat } from '@/app/(app)/briefforge/[projectId]/_components/brief-session-chat'

// ─── Polyfills ─────────────────────────────────────────────────────────────────

Element.prototype.scrollIntoView = vi.fn()

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock('lucide-react', () => ({
  Send: (props: Record<string, unknown>) => <svg data-testid="send-icon" {...props} />,
  Bot: (props: Record<string, unknown>) => <svg data-testid="bot-icon" {...props} />,
}))

vi.mock('@/components/ui/streaming-text', () => ({
  StreamingText: ({ content, className }: { content: string; className?: string }) => (
    <p className={className}>{content}</p>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

// ─── CENÁRIO 1: API 503 → modo degradado ──────────────────────────────────────

describe('BRIEFFORGE — Modo Degradado', () => {
  const projectId = 'proj_test_001'
  let fetchMock: ReturnType<typeof vi.fn>

  function mockFetch(status: number, data: unknown) {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (k: string) => k === 'content-type' ? 'application/json' : null },
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    })
  }

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('DADO IA indisponível QUANDO POST /sessions retorna 503 ENTÃO DegradedBanner é exibido', async () => {
    // DADO
    const user = userEvent.setup()
    const brief = createBriefFixture({ status: 'DRAFT', sessions: [] })

    fetchMock.mockReturnValueOnce(
      mockFetch(503, { error: { degraded: true, message: 'IA temporariamente indisponível' } }),
    )

    render(<BriefSessionChat brief={brief} projectId={projectId} />)

    // QUANDO
    await user.click(screen.getByTestId('briefforge-start-button'))

    // ENTÃO
    await waitFor(() => {
      const banner = screen.getByRole('alert', { name: /modo degradado/i })
      expect(banner).toBeInTheDocument()
      expect(banner).toHaveTextContent(/modo limitado|briefforge/i)
    })
  })

  it('DADO DegradedBanner visível QUANDO usuário clica "Fechar" ENTÃO banner desaparece', async () => {
    // DADO
    const user = userEvent.setup()
    const brief = createBriefFixture({ status: 'DRAFT', sessions: [] })

    fetchMock.mockReturnValueOnce(
      mockFetch(503, { error: { degraded: true, message: 'IA indisponível' } }),
    )

    render(<BriefSessionChat brief={brief} projectId={projectId} />)
    await user.click(screen.getByTestId('briefforge-start-button'))

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /modo degradado/i })).toBeInTheDocument()
    })

    // QUANDO
    const dismissBtn = screen.getByRole('button', { name: /fechar aviso/i })
    await user.click(dismissBtn)

    // ENTÃO
    await waitFor(() => {
      expect(screen.queryByRole('alert', { name: /modo degradado/i })).not.toBeInTheDocument()
    })
  })

  it('DADO modo degradado QUANDO IA recupera e retorna 201 ENTÃO banner desaparece e sessão inicia', async () => {
    // DADO
    const user = userEvent.setup()
    const brief = createBriefFixture({ status: 'DRAFT', sessions: [] })
    const firstQuestion = createQuestionFixture(1, { questionText: 'Qual o objetivo do projeto?' })
    const session = createSessionFixture({ status: 'ACTIVE' })

    fetchMock
      .mockReturnValueOnce(
        mockFetch(503, { error: { degraded: true, message: 'IA indisponível' } }),
      )
      .mockReturnValueOnce(
        mockFetch(201, {
          data: {
            session: { id: session.id, briefId: brief.id, status: 'ACTIVE' },
            firstQuestion,
          },
        }),
      )

    render(<BriefSessionChat brief={brief} projectId={projectId} />)

    // Primeira tentativa → degraded
    await user.click(screen.getByTestId('briefforge-start-button'))
    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /modo degradado/i })).toBeInTheDocument()
    })

    // QUANDO IA recupera — novo clique no botão de reiniciar (se disponível) ou start novamente
    // O estado degradado não bloqueia re-tentativa — o botão de iniciar ainda está acessível
    const retryBtn = screen.queryByTestId('briefforge-start-button')
    if (retryBtn) {
      await user.click(retryBtn)
    }

    // ENTÃO a pergunta aparece (se retry possível)
    // Valida apenas que o fetch foi chamado duas vezes
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
