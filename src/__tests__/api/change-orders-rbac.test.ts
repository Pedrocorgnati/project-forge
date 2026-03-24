// ─── CHANGE ORDERS RBAC TESTS ─────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-4 (ST002)
// Testa RBAC estrito: PM não aprova, CLIENTE não cria, DEV sem acesso financeiro
// Rastreabilidade: INT-076

import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/get-user', () => ({ getServerUser: vi.fn() }))
vi.mock('@/lib/events/bus', () => ({ EventBus: { publish: vi.fn().mockResolvedValue(undefined) } }))
vi.mock('@/lib/rbac', () => ({ withProjectAccess: vi.fn().mockResolvedValue({ projectRole: 'PM' }) }))
vi.mock('@/lib/db', () => ({
  prisma: {
    project: { findUnique: vi.fn().mockResolvedValue({ id: 'proj', hourlyRate: 100, baseHours: 0 }) },
    task: { findMany: vi.fn().mockResolvedValue([]) },
    changeOrder: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    changeOrderTask: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}))

import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'

function mockUser(role: string, id = `${role}-1`) {
  vi.mocked(getServerUser).mockResolvedValue({ id, role, name: `${role} User` } as any)
}

function p() {
  return prisma as any
}

// ─── Criação de CO ────────────────────────────────────────────────────────────

describe('RBAC — Criação de CO', () => {
  beforeEach(() => vi.clearAllMocks())

  it('DEV recebe 403 ao criar CO', async () => {
    mockUser('DEV')
    const { POST } = await import('@/app/api/projects/[id]/change-orders/route')
    const req = new Request('http://localhost/api/projects/proj/change-orders', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', description: 'Descricao de teste aqui', impactHours: 5 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any, { params: Promise.resolve({ id: 'proj' }) })
    expect(res.status).toBe(403)
  })

  it('CLIENTE recebe 403 ao criar CO', async () => {
    mockUser('CLIENTE')
    const { POST } = await import('@/app/api/projects/[id]/change-orders/route')
    const req = new Request('http://localhost/api/projects/proj/change-orders', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', description: 'Descricao de teste aqui', impactHours: 5 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any, { params: Promise.resolve({ id: 'proj' }) })
    expect(res.status).toBe(403)
  })
})

// ─── Aprovação de CO ──────────────────────────────────────────────────────────

describe('RBAC — Aprovação de CO', () => {
  beforeEach(() => vi.clearAllMocks())

  it('PM recebe 403 ao tentar aprovar CO', async () => {
    mockUser('PM', 'pm-1')
    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/approve/route')
    const req = new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' } })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj', coId: 'co-1' }) })
    expect(res.status).toBe(403)
  })

  it('DEV recebe 403 ao tentar aprovar CO', async () => {
    mockUser('DEV')
    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/approve/route')
    const req = new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' } })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj', coId: 'co-1' }) })
    expect(res.status).toBe(403)
  })
})

// ─── Rejeição de CO ───────────────────────────────────────────────────────────

describe('RBAC — Rejeição de CO', () => {
  beforeEach(() => vi.clearAllMocks())

  it('PM recebe 403 ao tentar rejeitar CO', async () => {
    mockUser('PM')
    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/reject/route')
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ reason: 'Motivo válido aqui com mais de dez caracteres' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj', coId: 'co-1' }) })
    expect(res.status).toBe(403)
  })
})

// ─── Listagem de CO ───────────────────────────────────────────────────────────

describe('RBAC — Listagem de CO', () => {
  beforeEach(() => vi.clearAllMocks())

  it('CLIENTE recebe apenas COs APPROVED', async () => {
    mockUser('CLIENTE')
    p().changeOrder.findMany.mockResolvedValue([
      {
        id: 'co-1',
        status: 'APPROVED',
        hoursImpact: 5,
        costImpact: 500,
        createdBy: 'pm-1',
        createdAt: new Date().toISOString(),
        tasks: [],
        creator: { id: 'pm-1', name: 'PM', role: 'PM' },
      },
    ])

    const { GET } = await import('@/app/api/projects/[id]/change-orders/route')
    const req = new Request('http://localhost/api/projects/proj/change-orders')
    const res = await GET(req as any, { params: Promise.resolve({ id: 'proj' }) })

    expect(res.status).toBe(200)
    expect(p().changeOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'APPROVED' }),
      }),
    )
  })

  it('DEV não recebe campos financeiros na listagem', async () => {
    mockUser('DEV')
    p().changeOrder.findMany.mockResolvedValue([
      {
        id: 'co-1',
        status: 'APPROVED',
        hoursImpact: 5,
        costImpact: 500,
        createdBy: 'pm-1',
        createdAt: new Date().toISOString(),
        tasks: [],
        creator: { id: 'pm-1', name: 'PM', role: 'PM' },
      },
    ])

    const { GET } = await import('@/app/api/projects/[id]/change-orders/route')
    const req = new Request('http://localhost/api/projects/proj/change-orders')
    const res = await GET(req as any, { params: Promise.resolve({ id: 'proj' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data[0]).not.toHaveProperty('impactHours')
    expect(data[0]).not.toHaveProperty('impactCost')
  })
})

// ─── Endpoint de Impacto ──────────────────────────────────────────────────────

describe('RBAC — Endpoint de Impacto', () => {
  beforeEach(() => vi.clearAllMocks())

  it('CLIENTE recebe 403 no endpoint /impact', async () => {
    mockUser('CLIENTE')
    const { GET } = await import('@/app/api/projects/[id]/change-orders/impact/route')
    const req = new Request('http://localhost/api/projects/proj/change-orders/impact')
    const res = await GET(req as any, { params: Promise.resolve({ id: 'proj' }) })
    expect(res.status).toBe(403)
  })

  it('DEV recebe 403 no endpoint /impact', async () => {
    mockUser('DEV')
    const { GET } = await import('@/app/api/projects/[id]/change-orders/impact/route')
    const req = new Request('http://localhost/api/projects/proj/change-orders/impact')
    const res = await GET(req as any, { params: Promise.resolve({ id: 'proj' }) })
    expect(res.status).toBe(403)
  })
})
