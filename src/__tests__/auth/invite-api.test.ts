import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── MOCK DO PRISMA ───────────────────────────────────────────────────────────

const mockUserFindFirst = vi.fn()
const mockInviteFindFirst = vi.fn()
const mockInviteCreate = vi.fn()
const mockInviteDelete = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
    inviteToken: {
      findFirst: (...args: unknown[]) => mockInviteFindFirst(...args),
      create: (...args: unknown[]) => mockInviteCreate(...args),
      delete: (...args: unknown[]) => mockInviteDelete(...args),
    },
  },
}))

// ─── MOCK DO SUPABASE SERVER ──────────────────────────────────────────────────

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { totp: [] } }),
      },
    },
  }),
}))

// ─── MOCK DO EMAIL ────────────────────────────────────────────────────────────

vi.mock('@/lib/email/resend', () => ({
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
}))

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function makeAuthUser(role: 'SOCIO' | 'PM' | 'DEV' | 'CLIENTE' = 'SOCIO') {
  return {
    id: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@empresa.com`,
    role,
    organizationId: 'org-1',
    name: role,
    avatarUrl: null,
    mfaEnabled: false,
    createdAt: new Date().toISOString(),
  }
}

async function _callInviteRoute(
  body: unknown,
  authUser: ReturnType<typeof makeAuthUser>,
): Promise<Response> {
  mockGetUser.mockResolvedValue({ data: { user: { id: authUser.id } }, error: null })

  // Mock do prisma.user para getServerUser buscar dados completos
  mockUserFindFirst.mockImplementationOnce(() => Promise.resolve(authUser))

  const { POST } = await import('@/app/api/auth/invite/route')
  const req = new Request('http://localhost/api/auth/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as never

  return POST(req)
}

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockUserFindFirst.mockResolvedValue(null)   // sem usuário existente por padrão
    mockInviteFindFirst.mockResolvedValue(null) // sem convite pendente por padrão
    mockInviteCreate.mockResolvedValue({ id: 'new-invite-id', token: 'token-abc' })
  })

  describe('autorização por role', () => {
    it('SOCIO pode enviar convite para PM', async () => {
      // Arrange
      const socioUser = makeAuthUser('SOCIO')
      mockGetUser.mockResolvedValue({ data: { user: { id: socioUser.id } }, error: null })

      // Rearranjar mocks para que o lookup do usuário retorne o SOCIO na autenticação
      // e null para verificação de email duplicado
      mockUserFindFirst
        .mockResolvedValueOnce(socioUser) // getServerUser
        .mockResolvedValueOnce(null)       // existingUser check

      const { POST } = await import('@/app/api/auth/invite/route')
      const req = new Request('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'novo-pm@empresa.com', role: 'PM' }),
      }) as never

      const res = await POST(req)

      expect(res.status).toBe(201)
    })

    it('SOCIO pode enviar convite para DEV', async () => {
      const socioUser = makeAuthUser('SOCIO')
      mockGetUser.mockResolvedValue({ data: { user: { id: socioUser.id } }, error: null })
      mockUserFindFirst
        .mockResolvedValueOnce(socioUser)
        .mockResolvedValueOnce(null)

      const { POST } = await import('@/app/api/auth/invite/route')
      const req = new Request('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'novo-dev@empresa.com', role: 'DEV' }),
      }) as never

      const res = await POST(req)

      expect(res.status).toBe(201)
    })

    it('PM não pode enviar convite — retorna AUTH_005 (403)', async () => {
      const pmUser = makeAuthUser('PM')
      mockGetUser.mockResolvedValue({ data: { user: { id: pmUser.id } }, error: null })
      mockUserFindFirst.mockResolvedValueOnce(pmUser)

      const { POST } = await import('@/app/api/auth/invite/route')
      const req = new Request('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'novo@empresa.com', role: 'DEV' }),
      }) as never

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(403)
      expect(body.error.code).toBe('AUTH_005')
    })

    it('DEV não pode enviar convite — retorna AUTH_005 (403)', async () => {
      const devUser = makeAuthUser('DEV')
      mockGetUser.mockResolvedValue({ data: { user: { id: devUser.id } }, error: null })
      mockUserFindFirst.mockResolvedValueOnce(devUser)

      const { POST } = await import('@/app/api/auth/invite/route')
      const req = new Request('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'novo@empresa.com', role: 'DEV' }),
      }) as never

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(403)
      expect(body.error.code).toBe('AUTH_005')
    })
  })

  describe('validação de body', () => {
    it('body inválido (sem email) — retorna VAL_001 (400)', async () => {
      const socioUser = makeAuthUser('SOCIO')
      mockGetUser.mockResolvedValue({ data: { user: { id: socioUser.id } }, error: null })
      mockUserFindFirst.mockResolvedValueOnce(socioUser)

      const { POST } = await import('@/app/api/auth/invite/route')
      const req = new Request('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'DEV' }), // email ausente
      }) as never

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error.code).toBe('VAL_001')
    })

    it('body inválido (role não permitido) — retorna VAL_001 (400)', async () => {
      const socioUser = makeAuthUser('SOCIO')
      mockGetUser.mockResolvedValue({ data: { user: { id: socioUser.id } }, error: null })
      mockUserFindFirst.mockResolvedValueOnce(socioUser)

      const { POST } = await import('@/app/api/auth/invite/route')
      const req = new Request('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'teste@empresa.com', role: 'SOCIO' }), // SOCIO não é role convidável
      }) as never

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error.code).toBe('VAL_001')
    })

    it('body malformado (JSON inválido) — retorna VAL_001 (400)', async () => {
      const socioUser = makeAuthUser('SOCIO')
      mockGetUser.mockResolvedValue({ data: { user: { id: socioUser.id } }, error: null })
      mockUserFindFirst.mockResolvedValueOnce(socioUser)

      const { POST } = await import('@/app/api/auth/invite/route')
      const req = new Request('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }) as never

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error.code).toBe('VAL_001')
    })
  })

  describe('conflitos de email', () => {
    it('email com conta existente — retorna INVITE_002 (409)', async () => {
      const socioUser = makeAuthUser('SOCIO')
      mockGetUser.mockResolvedValue({ data: { user: { id: socioUser.id } }, error: null })
      mockUserFindFirst
        .mockResolvedValueOnce(socioUser)         // getServerUser
        .mockResolvedValueOnce({ id: 'existing' }) // existingUser check

      const { POST } = await import('@/app/api/auth/invite/route')
      const req = new Request('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ja-existe@empresa.com', role: 'DEV' }),
      }) as never

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(409)
      expect(body.error.code).toBe('INVITE_002')
    })

    it('convite pendente para mesmo email — retorna INVITE_003 (409)', async () => {
      const socioUser = makeAuthUser('SOCIO')
      mockGetUser.mockResolvedValue({ data: { user: { id: socioUser.id } }, error: null })
      mockUserFindFirst
        .mockResolvedValueOnce(socioUser) // getServerUser
        .mockResolvedValueOnce(null)       // existingUser — sem conta
      mockInviteFindFirst.mockResolvedValueOnce({ id: 'pending-invite' }) // convite pendente

      const { POST } = await import('@/app/api/auth/invite/route')
      const req = new Request('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'pendente@empresa.com', role: 'DEV' }),
      }) as never

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(409)
      expect(body.error.code).toBe('INVITE_003')
    })
  })

  describe('resposta de sucesso', () => {
    it('retorna 201 com inviteId ao criar convite válido', async () => {
      const socioUser = makeAuthUser('SOCIO')
      const createdInvite = { id: 'invite-xyz', token: 'token-xyz' }

      mockGetUser.mockResolvedValue({ data: { user: { id: socioUser.id } }, error: null })
      mockUserFindFirst
        .mockResolvedValueOnce(socioUser)
        .mockResolvedValueOnce(null)
      mockInviteCreate.mockResolvedValue(createdInvite)

      const { POST } = await import('@/app/api/auth/invite/route')
      const req = new Request('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'novo@empresa.com', role: 'DEV' }),
      }) as never

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.inviteId).toBe(createdInvite.id)
    })
  })
})
