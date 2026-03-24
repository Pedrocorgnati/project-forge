// src/components/portal/__tests__/portal-components.test.tsx
// module-16-clientportal-auth / TASK-4 ST006
// Testes de componentes do portal (renderização e interação)
// Rastreabilidade: INT-104

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ─── MOCKS ─────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  }),
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/components/ui/skeleton', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => <div data-testid="spinner" data-size={size} />,
}))

// ─── TESTES ─────────────────────────────────────────────────────────────────────

describe('InvalidInvitationPage', () => {
  beforeEach(async () => {
    vi.resetModules()
  })

  it('renderiza motivo e link para /login', async () => {
    const { InvalidInvitationPage } = await import('../invalid-invitation-page')
    render(<InvalidInvitationPage reason="Token expirado" />)

    expect(screen.getByText('Token expirado')).toBeDefined()
    expect(screen.getByText('Convite inválido')).toBeDefined()
    const link = screen.getByText('Acessar portal')
    expect(link.closest('a')?.getAttribute('href')).toBe('/login')
  })

  it('exibe mensagem padrão quando reason está vazio', async () => {
    const { InvalidInvitationPage } = await import('../invalid-invitation-page')
    render(<InvalidInvitationPage reason="" />)

    expect(screen.getByText('Link inválido.')).toBeDefined()
  })
})

describe('PortalInvitationCard', () => {
  it('exibe dados do convite e botão Aceitar', async () => {
    const { PortalInvitationCard } = await import('../portal-invitation-card')
    render(
      <PortalInvitationCard
        token="tok-123"
        projectName="Projeto Alpha"
        inviterName="Maria PM"
        clientEmail="client@test.com"
      />,
    )

    expect(screen.getByText('Projeto Alpha')).toBeDefined()
    expect(screen.getByText('Maria PM')).toBeDefined()
    expect(screen.getByText('client@test.com')).toBeDefined()
    expect(screen.getByText('Aceitar Convite')).toBeDefined()
  })

  it('troca para formulário de registro ao clicar Aceitar', async () => {
    const { PortalInvitationCard } = await import('../portal-invitation-card')
    render(
      <PortalInvitationCard
        token="tok-123"
        projectName="Projeto Alpha"
        inviterName="Maria PM"
        clientEmail="client@test.com"
      />,
    )

    fireEvent.click(screen.getByText('Aceitar Convite'))

    // Após clique, deve renderizar o formulário de registro
    expect(screen.getByText('Crie sua conta')).toBeDefined()
  })
})

describe('ClientInviteManager', () => {
  const defaultProps = {
    projectId: 'proj-1',
    initialAccesses: [
      {
        id: 'ca-1',
        clientEmail: 'active@test.com',
        status: 'ACTIVE' as const,
        invitedAt: '2025-01-01',
        inviter: { name: 'PM User' },
      },
      {
        id: 'ca-2',
        clientEmail: 'revoked@test.com',
        status: 'REVOKED' as const,
        invitedAt: '2025-01-02',
        inviter: { name: 'PM User' },
      },
    ],
  }

  it('lista convites com badges de status', async () => {
    const { ClientInviteManager } = await import('../client-invite-manager')
    render(<ClientInviteManager {...defaultProps} />)

    expect(screen.getByText('active@test.com')).toBeDefined()
    expect(screen.getByText('revoked@test.com')).toBeDefined()
    expect(screen.getByText('ACTIVE')).toBeDefined()
    expect(screen.getByText('REVOKED')).toBeDefined()
  })

  it('mostra botão revogar apenas para não-REVOKED', async () => {
    const { ClientInviteManager } = await import('../client-invite-manager')
    render(<ClientInviteManager {...defaultProps} />)

    // Deve ter apenas 1 botão de revogar (para ACTIVE, não para REVOKED)
    const revokeButtons = screen.getAllByRole('button', { name: /Revogar acesso/i })
    expect(revokeButtons).toHaveLength(1)
  })

  it('mostra mensagem vazia quando não há convites', async () => {
    const { ClientInviteManager } = await import('../client-invite-manager')
    render(<ClientInviteManager projectId="proj-1" initialAccesses={[]} />)

    expect(screen.getByText('Nenhum cliente convidado ainda.')).toBeDefined()
  })
})

describe('PortalHeader', () => {
  it('exibe nome do usuário e botão Sair', async () => {
    const { PortalHeader } = await import('../portal-header')
    render(<PortalHeader userName="João Cliente" />)

    expect(screen.getByText('João Cliente')).toBeDefined()
    expect(screen.getByText('Sair')).toBeDefined()
    expect(screen.getByText('ProjectForge — Portal')).toBeDefined()
  })
})
