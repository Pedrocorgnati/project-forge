import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── MOCK DO PRISMA ───────────────────────────────────────────────────────────

const mockFindUniqueInvite = vi.fn()
const mockUpdateInvite = vi.fn()
const mockUpsertUser = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    inviteToken: {
      findUnique: (...args: unknown[]) => mockFindUniqueInvite(...args),
      update: (...args: unknown[]) => mockUpdateInvite(...args),
    },
    user: {
      upsert: (...args: unknown[]) => mockUpsertUser(...args),
    },
  },
}))

// ─── IMPORT APÓS MOCK ─────────────────────────────────────────────────────────

const { syncUserToPrisma } = await import('@/lib/auth/sync-user')

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function makeSupabaseUser(overrides?: Partial<{ id: string; email: string; user_metadata: Record<string, unknown> }>) {
  return {
    id: 'supa-user-id',
    email: 'dev@empresa.com',
    user_metadata: { name: 'Dev User' },
    ...overrides,
  } as any
}

function makeInvite(overrides?: Partial<{ token: string; role: string; usedAt: Date | null; expiresAt: Date }>) {
  return {
    id: 'invite-id',
    token: 'valid-token',
    email: 'dev@empresa.com',
    role: 'DEV',
    usedAt: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias no futuro
    createdAt: new Date(),
    createdBy: 'socio-id',
    ...overrides,
  }
}

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('syncUserToPrisma', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsertUser.mockResolvedValue({})
    mockUpdateInvite.mockResolvedValue({})
  })

  describe('sem inviteToken (fluxo padrão)', () => {
    it('cria usuário com role padrão DEV quando não há token de convite', async () => {
      const user = makeSupabaseUser()

      await syncUserToPrisma(user)

      expect(mockUpsertUser).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: user.id },
          create: expect.objectContaining({ role: 'DEV' }),
        }),
      )
    })

    it('não consulta inviteToken quando nenhum token é fornecido', async () => {
      await syncUserToPrisma(makeSupabaseUser())

      expect(mockFindUniqueInvite).not.toHaveBeenCalled()
    })

    it('usa email como name quando user_metadata.name está ausente', async () => {
      const user = makeSupabaseUser({ user_metadata: {} })

      await syncUserToPrisma(user)

      expect(mockUpsertUser).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ name: user.email }),
        }),
      )
    })
  })

  describe('com inviteToken válido', () => {
    it('cria usuário com role extraída do convite (PM)', async () => {
      const invite = makeInvite({ role: 'PM' })
      mockFindUniqueInvite.mockResolvedValue(invite)

      await syncUserToPrisma(makeSupabaseUser(), invite.token)

      expect(mockUpsertUser).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ role: 'PM' }),
        }),
      )
    })

    it('marca o token do convite como usado após sincronização', async () => {
      const invite = makeInvite()
      mockFindUniqueInvite.mockResolvedValue(invite)

      await syncUserToPrisma(makeSupabaseUser(), invite.token)

      expect(mockUpdateInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: invite.token },
          data: { usedAt: expect.any(Date) },
        }),
      )
    })

    it('não sobrescreve role do upsert (update fica vazio)', async () => {
      const invite = makeInvite()
      mockFindUniqueInvite.mockResolvedValue(invite)

      await syncUserToPrisma(makeSupabaseUser(), invite.token)

      expect(mockUpsertUser).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {},
        }),
      )
    })
  })

  describe('com inviteToken inválido', () => {
    it('lança erro INVITE_001 quando token não existe', async () => {
      mockFindUniqueInvite.mockResolvedValue(null)

      await expect(syncUserToPrisma(makeSupabaseUser(), 'token-inexistente')).rejects.toThrow('INVITE_001')
    })

    it('lança erro INVITE_001 quando token já foi utilizado', async () => {
      const invite = makeInvite({ usedAt: new Date() })
      mockFindUniqueInvite.mockResolvedValue(invite)

      await expect(syncUserToPrisma(makeSupabaseUser(), invite.token)).rejects.toThrow('INVITE_001')
    })

    it('lança erro INVITE_001 quando token está expirado', async () => {
      const invite = makeInvite({ expiresAt: new Date(Date.now() - 1000) }) // 1 segundo no passado
      mockFindUniqueInvite.mockResolvedValue(invite)

      await expect(syncUserToPrisma(makeSupabaseUser(), invite.token)).rejects.toThrow('INVITE_001')
    })

    it('não cria usuário quando token é inválido', async () => {
      mockFindUniqueInvite.mockResolvedValue(null)

      try {
        await syncUserToPrisma(makeSupabaseUser(), 'token-invalido')
      } catch {
        // esperado
      }

      expect(mockUpsertUser).not.toHaveBeenCalled()
    })
  })

  describe('idempotência (re-sync)', () => {
    it('usa upsert — não duplica usuário em chamadas repetidas', async () => {
      await syncUserToPrisma(makeSupabaseUser())
      await syncUserToPrisma(makeSupabaseUser())

      // Duas chamadas ao upsert — sem erro de duplicidade
      expect(mockUpsertUser).toHaveBeenCalledTimes(2)
    })
  })
})
