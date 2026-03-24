// @vitest-environment jsdom
/**
 * DADO que o serviço de embeddings está indisponível (HANDOFFAI)
 * QUANDO IndexingStatusCard é renderizado com isAvailable=false
 * ENTÃO botão de indexação deve estar desabilitado e com tooltip informativo
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { IndexingStatusCard } from '@/app/(app)/projects/[id]/handoff/_components/IndexingStatusCard'

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('lucide-react', () => ({
  Loader2: (props: Record<string, unknown>) => <span data-testid="loader" {...props} />,
  Clock: (props: Record<string, unknown>) => <span data-testid="clock" {...props} />,
  CheckCircle: (props: Record<string, unknown>) => <span data-testid="check-circle" {...props} />,
  XCircle: (props: Record<string, unknown>) => <span data-testid="x-circle" {...props} />,
  AlertCircle: (props: Record<string, unknown>) => <span data-testid="alert-circle" {...props} />,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    title,
    onClick,
  }: {
    children: React.ReactNode
    disabled?: boolean
    title?: string
    onClick?: () => void
  }) => (
    <button disabled={disabled} title={title} onClick={onClick}>
      {children}
    </button>
  ),
}))

// ─── CENÁRIO 3: HANDOFFAI — Indexação desabilitada ────────────────────────────

describe('HANDOFFAI — Modo Degradado', () => {
  const projectId = 'proj_test_001'
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    vi.clearAllMocks()
  })

  it('DADO isAvailable=false QUANDO card é renderizado ENTÃO botão "Iniciar Indexação" está desabilitado', () => {
    // DADO / QUANDO
    render(
      <IndexingStatusCard
        initialRagIndex={null}
        isAvailable={false}
        projectId={projectId}
      />,
    )

    // ENTÃO
    const button = screen.getByRole('button', { name: /iniciar indexação/i })
    expect(button).toBeDisabled()
  })

  it('DADO isAvailable=false QUANDO card é renderizado ENTÃO botão tem title de indisponibilidade', () => {
    // DADO / QUANDO
    render(
      <IndexingStatusCard
        initialRagIndex={null}
        isAvailable={false}
        projectId={projectId}
      />,
    )

    // ENTÃO
    const button = screen.getByRole('button', { name: /iniciar indexação/i })
    expect(button).toHaveAttribute('title', expect.stringMatching(/indisponível|embeddings/i))
  })

  it('DADO isAvailable=false QUANDO usuário clica no botão desabilitado ENTÃO fetch NÃO é chamado', async () => {
    // DADO
    const user = userEvent.setup()

    render(
      <IndexingStatusCard
        initialRagIndex={null}
        isAvailable={false}
        projectId={projectId}
      />,
    )

    // QUANDO
    const button = screen.getByRole('button', { name: /iniciar indexação/i })
    await user.click(button)

    // ENTÃO
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('DADO isAvailable=true QUANDO card é renderizado ENTÃO botão "Iniciar Indexação" está habilitado', () => {
    // DADO / QUANDO
    render(
      <IndexingStatusCard
        initialRagIndex={null}
        isAvailable={true}
        projectId={projectId}
      />,
    )

    // ENTÃO — modo normal: botão habilitado
    const button = screen.getByRole('button', { name: /iniciar indexação/i })
    expect(button).not.toBeDisabled()
    expect(button).not.toHaveAttribute('title', expect.stringMatching(/indisponível/i))
  })
})
