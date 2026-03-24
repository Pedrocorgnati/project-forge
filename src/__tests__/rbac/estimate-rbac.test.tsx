// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { PermissionGate } from '@/components/auth/PermissionGate'

const mockUseAuth = vi.fn()

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}))

function makeUser(role: string) {
  return { id: 'u1', email: 'test@test.com', role, name: 'Test' }
}

describe('Estimate RBAC — PermissionGate UI level', () => {
  afterEach(() => vi.clearAllMocks())

  it('hides children for DEV role when SOCIO/PM required', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('DEV'), loading: false })
    render(
      <PermissionGate role={['SOCIO', 'PM']}>
        <button>Gerar estimativa</button>
      </PermissionGate>
    )
    expect(screen.queryByRole('button', { name: /gerar estimativa/i })).not.toBeInTheDocument()
  })

  it('shows children for PM role when SOCIO/PM required', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('PM'), loading: false })
    render(
      <PermissionGate role={['SOCIO', 'PM']}>
        <button>Gerar estimativa</button>
      </PermissionGate>
    )
    expect(screen.getByRole('button', { name: /gerar estimativa/i })).toBeInTheDocument()
  })

  it('shows children for SOCIO role when SOCIO/PM required', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('SOCIO'), loading: false })
    render(
      <PermissionGate role={['SOCIO', 'PM']}>
        <button>Gerar estimativa</button>
      </PermissionGate>
    )
    expect(screen.getByRole('button', { name: /gerar estimativa/i })).toBeInTheDocument()
  })

  it('renders fallback for DEV when provided', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('DEV'), loading: false })
    render(
      <PermissionGate role={['SOCIO', 'PM']} fallback={<span>Sem permissão</span>}>
        <button>Gerar estimativa</button>
      </PermissionGate>
    )
    expect(screen.getByText('Sem permissão')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('hides children when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    render(
      <PermissionGate role={['SOCIO', 'PM']}>
        <button>Revisar estimativa</button>
      </PermissionGate>
    )
    expect(screen.queryByRole('button', { name: /revisar estimativa/i })).not.toBeInTheDocument()
  })

  it('renders nothing while loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    const { container } = render(
      <PermissionGate role={['SOCIO', 'PM']}>
        <button>Ação protegida</button>
      </PermissionGate>
    )
    expect(container.firstChild).toBeNull()
  })
})
