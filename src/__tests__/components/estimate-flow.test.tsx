// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

/* ── Mocks ──────────────────────────────────────────────────────────────────── */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardFooter: ({ children, className }: any) => <div className={className}>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, loading, ...rest }: any) => (
    <button disabled={disabled || loading} onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/modal', () => ({
  Modal: ({ open, children, title, description, footer }: any) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <p>{description}</p>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null,
}))

vi.mock('@/components/estimates/estimate-status-badge', () => ({
  EstimateStatusBadge: ({ status }: any) => <span data-testid="status-badge">{status}</span>,
}))

vi.mock('@/components/estimates/confidence-badge', () => ({
  ConfidenceBadge: ({ confidence }: any) => <span data-testid="confidence-badge">{confidence}</span>,
}))

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ name }: any) => <span>{name}</span>,
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

vi.mock('@/lib/utils/format', () => ({
  formatCurrency: (v: number) => `R$ ${v}`,
  formatHours: (v: number) => `${v}h`,
  formatDate: (_d: any) => '01/01/2025',
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

import { GenerateEstimateButton } from '@/components/estimates/generate-estimate-button'
import { EstimateCard } from '@/components/estimates/estimate-card'
import { ReviseModal } from '@/components/estimates/revise-modal'
import { EstimateVersionHistory } from '@/components/estimates/estimate-version-history'
import { toast } from '@/components/ui/toast'

/* ── GenerateEstimateButton ─────────────────────────────────────────────────── */

describe('GenerateEstimateButton', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('shows loading state during POST', async () => {
    let resolvePost: (v: Response) => void
    const pending = new Promise<Response>((r) => { resolvePost = r })
    vi.spyOn(globalThis, 'fetch').mockReturnValue(pending as any)

    render(<GenerateEstimateButton projectId="p1" />)
    const button = screen.getByRole('button')
    await userEvent.click(button)

    expect(button).toBeDisabled()
    expect(button.textContent).toContain('Iniciando')

    resolvePost!(new Response(JSON.stringify({}), { status: 200 }))
    await waitFor(() => expect(button).not.toBeDisabled())
  })

  it('shows error toast on 422 (brief not approved)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Brief aprovado não encontrado.' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    render(<GenerateEstimateButton projectId="p1" />)
    await userEvent.click(screen.getByRole('button'))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Brief aprovado não encontrado.'),
    )
  })
})

/* ── EstimateCard ───────────────────────────────────────────────────────────── */

describe('EstimateCard', () => {
  const readyEstimate = {
    id: 'e1',
    projectId: 'p1',
    version: 2,
    status: 'READY' as const,
    totalMin: 40,
    totalMax: 80,
    currency: 'BRL',
    confidence: 'HIGH' as const,
    createdAt: '2025-01-01T00:00:00Z',
    _count: { items: 5 },
  }

  it('renders range and confidence for READY estimate', () => {
    render(<EstimateCard estimate={readyEstimate} />)
    expect(screen.getByText(/40h/)).toBeInTheDocument()
    expect(screen.getByText(/80h/)).toBeInTheDocument()
    expect(screen.getByTestId('confidence-badge')).toHaveTextContent('HIGH')
    expect(screen.getByText('Ver detalhes')).toBeInTheDocument()
  })

  it('shows generating skeleton for GENERATING estimate', () => {
    const generating = { ...readyEstimate, status: 'GENERATING' as const }
    render(<EstimateCard estimate={generating} />)
    expect(screen.getByLabelText('Gerando estimativa…')).toBeInTheDocument()
    expect(screen.queryByTestId('confidence-badge')).not.toBeInTheDocument()
  })
})

/* ── ReviseModal ────────────────────────────────────────────────────────────── */

describe('ReviseModal', () => {
  it('disables confirm button when reason < 10 chars', async () => {
    const onConfirm = vi.fn()
    render(
      <ReviseModal open={true} onOpenChange={vi.fn()} onConfirm={onConfirm} />,
    )

    const textarea = screen.getByRole('textbox')
    const confirmBtn = screen.getByRole('button', { name: /confirmar revisão/i })

    // Initially disabled
    expect(confirmBtn).toBeDisabled()

    // Type 5 chars — still disabled
    await userEvent.type(textarea, 'short')
    expect(confirmBtn).toBeDisabled()

    // Type enough chars — enabled
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'Motivo com mais de dez caracteres')
    expect(confirmBtn).not.toBeDisabled()
  })
})

/* ── EstimateVersionHistory ─────────────────────────────────────────────────── */

describe('EstimateVersionHistory', () => {
  it('renders all versions with correct labels', () => {
    const estimates = [
      {
        id: 'e3',
        version: 3,
        status: 'READY' as const,
        totalMin: 50,
        totalMax: 90,
        confidence: 'HIGH' as const,
        createdAt: '2025-03-01T00:00:00Z',
      },
      {
        id: 'e2',
        version: 2,
        status: 'ARCHIVED' as const,
        totalMin: 40,
        totalMax: 80,
        confidence: 'MEDIUM' as const,
        createdAt: '2025-02-01T00:00:00Z',
        versions: [{ reason: 'Escopo mudou', revisedBy: 'u1', createdAt: '2025-02-01T00:00:00Z' }],
      },
      {
        id: 'e1',
        version: 1,
        status: 'ARCHIVED' as const,
        totalMin: 30,
        totalMax: 60,
        confidence: 'LOW' as const,
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]

    render(
      <EstimateVersionHistory
        estimates={estimates}
        currentEstimateId="e3"
        projectId="p1"
      />,
    )

    expect(screen.getByText(/Versão 3/)).toBeInTheDocument()
    expect(screen.getByText(/Versão 2/)).toBeInTheDocument()
    expect(screen.getByText(/Versão 1/)).toBeInTheDocument()
    expect(screen.getByText(/\(atual\)/)).toBeInTheDocument()
    expect(screen.getByText(/Escopo mudou/)).toBeInTheDocument()
  })
})
