// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/components/ui/streaming-text', () => ({
  StreamingText: ({ content, className }: { content: string; className?: string }) => (
    <div data-testid="streaming-text" className={className}>
      {content}
    </div>
  ),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    loading,
    ...props
  }: {
    children: React.ReactNode
    disabled?: boolean
    onClick?: () => void
    loading?: boolean
    icon?: React.ReactNode
    variant?: string
    size?: string
  }) => (
    <button disabled={disabled || loading} onClick={onClick} data-testid="submit-button" {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
}))

vi.mock('lucide-react', () => ({
  Send: (props: Record<string, unknown>) => <svg data-testid="send-icon" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="loader-icon" {...props} />,
  Bot: (props: Record<string, unknown>) => <svg data-testid="bot-icon" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-down" {...props} />,
  ChevronUp: (props: Record<string, unknown>) => <svg data-testid="chevron-up" {...props} />,
  FileText: (props: Record<string, unknown>) => <svg data-testid="file-text" {...props} />,
  History: (props: Record<string, unknown>) => <svg data-testid="history-icon" {...props} />,
}))

// ─── Component Imports (after mocks) ───────────────────────────────────────────

import { QueryInput } from '../_components/QueryInput'
import { AnswerDisplay } from '../_components/AnswerDisplay'
import { SourceCitations } from '../_components/SourceCitations'
import { QueryHistory } from '../_components/QueryHistory'

// ─── QueryInput Tests ───────────────────────────────────────────────────────────

describe('QueryInput', () => {
  beforeEach(() => vi.clearAllMocks())

  it('botão desabilitado quando aiAvailable=false', () => {
    render(<QueryInput projectId="proj-1" aiAvailable={false} />)

    const button = screen.getByTestId('submit-button')
    expect(button).toBeDisabled()
  })

  it('botão desabilitado quando query < 3 caracteres', async () => {
    const user = userEvent.setup()
    render(<QueryInput projectId="proj-1" aiAvailable={true} />)

    const textarea = screen.getByPlaceholderText(/Como funciona/)
    await user.type(textarea, 'ab')

    const button = screen.getByTestId('submit-button')
    expect(button).toBeDisabled()
  })

  it('botão habilitado quando aiAvailable=true e query >= 3 caracteres', async () => {
    const user = userEvent.setup()
    render(<QueryInput projectId="proj-1" aiAvailable={true} />)

    const textarea = screen.getByPlaceholderText(/Como funciona/)
    await user.type(textarea, 'abc')

    const button = screen.getByTestId('submit-button')
    expect(button).not.toBeDisabled()
  })

  it('mostra texto "IA indisponivel" quando aiAvailable=false', () => {
    render(<QueryInput projectId="proj-1" aiAvailable={false} />)

    expect(screen.getByText(/IA indisponível/)).toBeInTheDocument()
  })
})

// ─── AnswerDisplay Tests ────────────────────────────────────────────────────────

describe('AnswerDisplay', () => {
  it('mostra "Gerando resposta..." quando answer="" e isStreaming=true', () => {
    render(
      <AnswerDisplay
        query="Como funciona?"
        answer=""
        sourceDocs={[]}
        isStreaming={true}
      />,
    )

    expect(screen.getByText('Gerando resposta...')).toBeInTheDocument()
  })

  it('mostra texto da resposta quando isStreaming=false e answer tem conteúdo', () => {
    render(
      <AnswerDisplay
        query="Como funciona?"
        answer="O projeto usa Next.js 14."
        sourceDocs={[]}
        isStreaming={false}
      />,
    )

    const streamingText = screen.getByTestId('streaming-text')
    expect(streamingText).toHaveTextContent('O projeto usa Next.js 14.')
  })

  it('mostra SourceCitations quando sourceDocs tem itens', () => {
    render(
      <AnswerDisplay
        query="Qual o stack?"
        answer="Resposta aqui"
        sourceDocs={[
          { documentTitle: 'README.md', excerpt: 'Trecho do README' },
          { documentTitle: 'PRD.md', excerpt: 'Trecho do PRD' },
        ]}
        isStreaming={false}
      />,
    )

    expect(screen.getByText(/2 fontes consultadas/)).toBeInTheDocument()
  })

  it('não mostra SourceCitations quando sourceDocs está vazio', () => {
    render(
      <AnswerDisplay
        query="Pergunta"
        answer="Resposta"
        sourceDocs={[]}
        isStreaming={false}
      />,
    )

    expect(screen.queryByText(/fonte/)).not.toBeInTheDocument()
  })
})

// ─── SourceCitations Tests ──────────────────────────────────────────────────────

describe('SourceCitations', () => {
  it('retorna null quando sourceDocs está vazio', () => {
    const { container } = render(<SourceCitations sourceDocs={[]} />)

    expect(container.innerHTML).toBe('')
  })

  it('mostra texto correto de contagem com 1 item', () => {
    render(
      <SourceCitations
        sourceDocs={[{ documentTitle: 'README.md', excerpt: 'Trecho' }]}
      />,
    )

    expect(screen.getByText(/1 fonte consultada/)).toBeInTheDocument()
  })

  it('mostra texto correto de contagem com múltiplos itens', () => {
    render(
      <SourceCitations
        sourceDocs={[
          { documentTitle: 'README.md', excerpt: 'Trecho 1' },
          { documentTitle: 'PRD.md', excerpt: 'Trecho 2' },
          { documentTitle: 'HLD.md', excerpt: 'Trecho 3' },
        ]}
      />,
    )

    expect(screen.getByText(/3 fontes consultadas/)).toBeInTheDocument()
  })

  it('expande e colapsa ao clicar', async () => {
    const user = userEvent.setup()
    render(
      <SourceCitations
        sourceDocs={[
          { documentTitle: 'README.md', excerpt: 'Trecho do readme' },
          { documentTitle: 'PRD.md', excerpt: 'Trecho do PRD' },
        ]}
      />,
    )

    // Initially collapsed — no document titles visible
    expect(screen.queryByText('README.md')).not.toBeInTheDocument()

    // Click to expand
    const toggleButton = screen.getByRole('button', { expanded: false })
    await user.click(toggleButton)

    // Now document titles visible
    expect(screen.getByText('README.md')).toBeInTheDocument()
    expect(screen.getByText('PRD.md')).toBeInTheDocument()

    // Click to collapse
    const collapseButton = screen.getByRole('button', { expanded: true })
    await user.click(collapseButton)

    // Document titles hidden again
    expect(screen.queryByText('README.md')).not.toBeInTheDocument()
  })
})

// ─── QueryHistory Tests ─────────────────────────────────────────────────────────

describe('QueryHistory', () => {
  const mockQueries = [
    {
      id: 'q-1',
      query: 'Como funciona a autenticação?',
      answer: 'O projeto usa Supabase Auth para autenticação com magic link e OAuth providers.',
      sources: [{ documentTitle: 'PRD.md', excerpt: 'Auth via Supabase' }],
      createdAt: '2026-03-20T14:30:00Z',
    },
    {
      id: 'q-2',
      query: 'Qual o banco de dados?',
      answer: null,
      sources: [],
      createdAt: '2026-03-20T15:00:00Z',
    },
    {
      id: 'q-3',
      query: 'Como funciona o deploy?',
      answer:
        'O deploy é feito via Vercel com preview deployments para PRs. A pipeline CI/CD executa lint, type-check e testes antes de publicar. Há proteção de branch para main.',
      sources: [{ documentTitle: 'HLD.md', excerpt: 'Deploy via Vercel' }],
      createdAt: '2026-03-20T16:00:00Z',
    },
  ]

  it('renderiza todos os itens de query', () => {
    render(<QueryHistory queries={mockQueries} />)

    expect(screen.getByText('Como funciona a autenticação?')).toBeInTheDocument()
    expect(screen.getByText('Qual o banco de dados?')).toBeInTheDocument()
    expect(screen.getByText('Como funciona o deploy?')).toBeInTheDocument()
  })

  it('mostra contagem correta no header', () => {
    render(<QueryHistory queries={mockQueries} />)

    expect(screen.getByText(`Historico de Perguntas (${mockQueries.length})`)).toBeInTheDocument()
  })

  it('mostra preview truncado da resposta (max 120 chars + ...)', () => {
    render(<QueryHistory queries={mockQueries} />)

    // q-3 answer is > 120 chars, should show truncated preview
    const longAnswer = mockQueries[2].answer!
    const truncated = longAnswer.slice(0, 120) + '...'
    expect(screen.getByText(truncated)).toBeInTheDocument()
  })

  it('mostra "Sem resposta" quando answer é null', () => {
    render(<QueryHistory queries={mockQueries} />)

    expect(screen.getByText('Sem resposta')).toBeInTheDocument()
  })

  it('expande item ao clicar mostrando resposta completa', async () => {
    const user = userEvent.setup()
    render(<QueryHistory queries={mockQueries} />)

    // Click first query to expand
    const firstButton = screen.getByText('Como funciona a autenticação?').closest('button')!
    await user.click(firstButton)

    // Full answer should now be visible
    expect(
      screen.getByText(
        'O projeto usa Supabase Auth para autenticação com magic link e OAuth providers.',
      ),
    ).toBeInTheDocument()
  })
})
