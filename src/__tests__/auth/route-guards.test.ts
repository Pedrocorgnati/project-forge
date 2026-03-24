import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ROUTE_GUARDS, FALLBACK_ROUTE } from '@/lib/supabase/middleware'

// Mock do Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    projectMember: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock do Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }),
}))

describe('ROUTE_GUARDS — mapa de rotas protegidas', () => {
  it('dashboard é acessível por SOCIO, PM, DEV', () => {
    expect(ROUTE_GUARDS['/dashboard']).toContain('SOCIO')
    expect(ROUTE_GUARDS['/dashboard']).toContain('PM')
    expect(ROUTE_GUARDS['/dashboard']).toContain('DEV')
    expect(ROUTE_GUARDS['/dashboard']).not.toContain('CLIENTE')
  })

  it('portal é acessível apenas por CLIENTE', () => {
    expect(ROUTE_GUARDS['/portal']).toContain('CLIENTE')
    expect(ROUTE_GUARDS['/portal']).not.toContain('SOCIO')
    expect(ROUTE_GUARDS['/portal']).not.toContain('PM')
    expect(ROUTE_GUARDS['/portal']).not.toContain('DEV')
  })

  it('configuracoes é acessível apenas por SOCIO', () => {
    expect(ROUTE_GUARDS['/configuracoes']).toEqual(['SOCIO'])
  })
})

describe('FALLBACK_ROUTE — redirecionamentos por role', () => {
  it('CLIENTE → /portal', () => {
    expect(FALLBACK_ROUTE['CLIENTE']).toBe('/portal')
  })

  it('SOCIO → /dashboard', () => {
    expect(FALLBACK_ROUTE['SOCIO']).toBe('/dashboard')
  })

  it('PM → /dashboard', () => {
    expect(FALLBACK_ROUTE['PM']).toBe('/dashboard')
  })

  it('DEV → /dashboard', () => {
    expect(FALLBACK_ROUTE['DEV']).toBe('/dashboard')
  })
})

describe('withAuth — API Routes', () => {
  it('AUTH_001 é retornado quando getServerUser retorna null', async () => {
    const { withAuth } = await import('@/lib/auth/with-auth')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        mfa: {
          listFactors: vi.fn().mockResolvedValue({ data: { totp: [] } }),
        },
      },
    } as never)

    const handler = vi.fn()
    const wrappedHandler = withAuth(handler)

    const mockReq = new Request('http://localhost/api/test') as never
    const res = await wrappedHandler(mockReq)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('AUTH_001')
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('withRole — API Routes', () => {
  it('AUTH_005 é retornado quando role não está na lista', async () => {
    const { withRole } = await import('@/lib/auth/with-role')

    const handler = vi.fn()
    const wrappedHandler = withRole(handler, ['SOCIO'])

    const mockReq = new Request('http://localhost/api/test') as never
    const mockUser = { id: '1', email: 'pm@test.com', role: 'PM', organizationId: 'org1', name: null, avatarUrl: null, mfaEnabled: false, createdAt: '' }

    const res = await wrappedHandler(mockReq, { user: mockUser as never })
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe('AUTH_005')
    expect(handler).not.toHaveBeenCalled()
  })

  it('Handler é chamado quando role está na lista', async () => {
    const { withRole } = await import('@/lib/auth/with-role')

    const handler = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }))
    const wrappedHandler = withRole(handler, ['SOCIO', 'PM'])

    const mockReq = new Request('http://localhost/api/test') as never
    const mockUser = { id: '1', email: 'socio@test.com', role: 'SOCIO', organizationId: 'org1', name: null, avatarUrl: null, mfaEnabled: false, createdAt: '' }

    const res = await wrappedHandler(mockReq, { user: mockUser as never })

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('assertProjectAccess — anti-IDOR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lança AUTH_003 quando PM não é membro do projeto', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(null)

    const { assertProjectAccess } = await import('@/lib/auth/project-access')

    await expect(
      assertProjectAccess('pm-user-id', 'foreign-project-id')
    ).rejects.toThrow()
  })

  it('SOCIO tem acesso com bypass se org é a mesma', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({
      id: '1',
      projectId: 'proj-1',
      userId: 'socio-1',
      role: 'SOCIO',
      createdAt: new Date(),
      project: { organizationId: 'org-1' },
      user: { organizationId: 'org-1', role: 'SOCIO' },
    } as never)

    const { assertProjectAccess } = await import('@/lib/auth/project-access')

    await expect(
      assertProjectAccess('socio-1', 'proj-1')
    ).resolves.toBeDefined()
  })
})
