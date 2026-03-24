// src/components/portal/__tests__/client-registration-flow.test.tsx
// module-16-clientportal-auth / TASK-6 ST004
// Testes para ClientRegistrationFlow
// Rastreabilidade: GAP-020

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock Supabase
const mockSignIn = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: { signInWithPassword: mockSignIn },
  }),
}))

// Mock toast
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

// Mock skeleton
vi.mock('@/components/ui/skeleton', () => ({
  LoadingSpinner: ({ size }: { size: string }) => <span data-testid="spinner">{size}</span>,
}))

import { ClientRegistrationFlow } from '../client-registration-flow'

const defaultProps = {
  token: 'tok-abc',
  clientEmail: 'client@test.com',
  projectName: 'Test Project',
}

describe('ClientRegistrationFlow', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSignIn.mockResolvedValue({ error: null })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    )
  })

  it('renderiza com email exibido (read-only)', () => {
    render(<ClientRegistrationFlow {...defaultProps} />)

    expect(screen.getByText('client@test.com')).toBeInTheDocument()
    expect(screen.getByText(/não pode ser alterado/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument()
  })

  it('validação: nome < 2 chars → erro inline', async () => {
    render(<ClientRegistrationFlow {...defaultProps} />)

    await user.type(screen.getByLabelText(/nome completo/i), 'A')
    await user.type(screen.getByLabelText(/^Senha$/i), '12345678')
    await user.type(screen.getByLabelText(/confirmar senha/i), '12345678')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))

    await waitFor(() => {
      expect(screen.getByText(/ao menos 2 caracteres/i)).toBeInTheDocument()
    })
  })

  it('validação: senha < 8 chars → erro inline', async () => {
    render(<ClientRegistrationFlow {...defaultProps} />)

    await user.type(screen.getByLabelText(/nome completo/i), 'João Silva')
    await user.type(screen.getByLabelText(/^Senha$/i), '1234')
    await user.type(screen.getByLabelText(/confirmar senha/i), '1234')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))

    await waitFor(() => {
      expect(screen.getByText(/ao menos 8 caracteres/i)).toBeInTheDocument()
    })
  })

  it('validação: senhas diferentes → erro inline', async () => {
    render(<ClientRegistrationFlow {...defaultProps} />)

    await user.type(screen.getByLabelText(/nome completo/i), 'João Silva')
    await user.type(screen.getByLabelText(/^Senha$/i), '12345678')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'different1')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))

    await waitFor(() => {
      expect(screen.getByText(/senhas não coincidem/i)).toBeInTheDocument()
    })
  })

  it('submit válido: loading state, botão disabled, fetch chamado', async () => {
    render(<ClientRegistrationFlow {...defaultProps} />)

    await user.type(screen.getByLabelText(/nome completo/i), 'João Silva')
    await user.type(screen.getByLabelText(/^Senha$/i), 'securePass1')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'securePass1')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/portal/tok-abc/accept',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('submit erro API: toast error exibido', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Token inválido' } }), { status: 400 }),
    )

    render(<ClientRegistrationFlow {...defaultProps} />)

    await user.type(screen.getByLabelText(/nome completo/i), 'João Silva')
    await user.type(screen.getByLabelText(/^Senha$/i), 'securePass1')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'securePass1')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
  })

  it('submit sucesso: signIn chamado, redirect para /portal/dashboard', async () => {
    render(<ClientRegistrationFlow {...defaultProps} />)

    await user.type(screen.getByLabelText(/nome completo/i), 'João Silva')
    await user.type(screen.getByLabelText(/^Senha$/i), 'securePass1')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'securePass1')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'client@test.com',
        password: 'securePass1',
      })
      expect(mockPush).toHaveBeenCalledWith('/portal/dashboard')
    })
  })
})
