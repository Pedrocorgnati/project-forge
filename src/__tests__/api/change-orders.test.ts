// ─── CHANGE ORDERS API TESTS ──────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-4 (ST001)
// Testa o ciclo de vida completo: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED
// Rastreabilidade: INT-076

import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/get-user', () => ({ getServerUser: vi.fn() }))
vi.mock('@/lib/events/bus', () => ({ EventBus: { publish: vi.fn().mockResolvedValue(undefined) } }))
vi.mock('@/lib/rbac', () => ({ withProjectAccess: vi.fn().mockResolvedValue({ projectRole: 'PM' }) }))
vi.mock('@/lib/db', () => ({
  prisma: {
    project: { findUnique: vi.fn(), update: vi.fn().mockResolvedValue({}) },
    task: { findMany: vi.fn().mockResolvedValue([]) },
    changeOrder: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    changeOrderTask: {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    },
  },
}))

import { getServerUser } from '@/lib/auth/get-user'
import { EventBus } from '@/lib/events/bus'
import { EventType } from '@/lib/constants/events'
import { prisma } from '@/lib/db'

function mockUser(role: string, id = `user-${role}`) {
  vi.mocked(getServerUser).mockResolvedValue({ id, role, name: `${role} Test` } as any)
}

function p() {
  return prisma as any
}

function setupProject() {
  vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: 'proj-1', hourlyRate: 100, baseHours: 100 } as any)
}

// ─── POST /api/projects/[id]/change-orders ────────────────────────────────────

describe('POST /api/projects/[id]/change-orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    p().changeOrder.findFirst.mockResolvedValue(null)
  })

  it('PM cria CO com status DRAFT e impactCost calculado', async () => {
    mockUser('PM', 'pm-1')
    setupProject()
    p().changeOrder.create.mockResolvedValue({
      id: 'co-1',
      title: 'Nova feature',
      status: 'DRAFT',
      hoursImpact: 8,
      costImpact: 800,
      createdBy: 'pm-1',
      createdAt: new Date().toISOString(),
      tasks: [],
      creator: { id: 'pm-1', name: 'PM Test', role: 'PM' },
    })

    const { POST } = await import('@/app/api/projects/[id]/change-orders/route')
    const req = new Request('http://localhost/api/projects/proj-1/change-orders', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Nova feature',
        description: 'Adicionar módulo de relatórios ao sistema',
        impactHours: 8,
        affectedTaskIds: [],
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any, { params: Promise.resolve({ id: 'proj-1' }) })
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.status).toBe('DRAFT')
    expect(data.impactHours).toBe(8)
    expect(data.impactCost).toBe(800)
    expect(EventBus.publish).toHaveBeenCalledWith(
      EventType.CHANGE_ORDER_CREATED,
      'proj-1',
      expect.objectContaining({ changeOrderId: 'co-1' }),
      'module-11',
    )
  })

  it('CLIENTE recebe 403', async () => {
    mockUser('CLIENTE')
    const { POST } = await import('@/app/api/projects/[id]/change-orders/route')
    const req = new Request('http://localhost/api/projects/proj-1/change-orders', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', description: 'Test CO com motivo', impactHours: 1 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any, { params: Promise.resolve({ id: 'proj-1' }) })
    expect(res.status).toBe(403)
  })

  it('DEV recebe 403', async () => {
    mockUser('DEV')
    const { POST } = await import('@/app/api/projects/[id]/change-orders/route')
    const req = new Request('http://localhost/api/projects/proj-1/change-orders', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', description: 'Test CO com motivo', impactHours: 1 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any, { params: Promise.resolve({ id: 'proj-1' }) })
    expect(res.status).toBe(403)
  })
})

// ─── PATCH .../submit ─────────────────────────────────────────────────────────

describe('PATCH /api/projects/[id]/change-orders/[coId]/submit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('PM submete CO DRAFT e evento CHANGE_ORDER_SUBMITTED é publicado', async () => {
    mockUser('PM', 'pm-1')
    setupProject()
    const draftCO = {
      id: 'co-1', status: 'DRAFT', createdBy: 'pm-1', projectId: 'proj-1', title: 'CO Test', hoursImpact: 8,
    }
    p().changeOrder.findUnique.mockResolvedValue(draftCO)
    p().changeOrder.findFirst.mockResolvedValue(null)
    p().changeOrder.update.mockResolvedValue({
      ...draftCO, status: 'PENDING_APPROVAL', costImpact: 800,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      tasks: [], creator: { id: 'pm-1', name: 'PM Test', role: 'PM' },
    })

    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/submit/route')
    const req = new Request('http://localhost/api/projects/proj-1/change-orders/co-1/submit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })

    expect(res.status).toBe(200)
    expect(EventBus.publish).toHaveBeenCalledWith(
      EventType.CHANGE_ORDER_SUBMITTED,
      'proj-1',
      expect.objectContaining({ changeOrderId: 'co-1' }),
      'module-11',
    )
  })

  it('PM não pode submeter CO de outro usuário (403)', async () => {
    mockUser('PM', 'pm-1')
    p().changeOrder.findUnique.mockResolvedValue({
      id: 'co-1', status: 'DRAFT', createdBy: 'outro-pm-2', projectId: 'proj-1',
    })

    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/submit/route')
    const req = new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' } })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })

    expect(res.status).toBe(403)
  })

  it('Retorna 409 se já existe CO em PENDING_APPROVAL (CO_051)', async () => {
    mockUser('PM', 'pm-1')
    p().changeOrder.findUnique.mockResolvedValue({
      id: 'co-1', status: 'DRAFT', createdBy: 'pm-1', projectId: 'proj-1', title: 'CO', hoursImpact: 5,
    })
    p().changeOrder.findFirst.mockResolvedValue({ id: 'co-already-pending' })

    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/submit/route')
    const req = new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' } })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })

    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error.code).toBe('CO_051')
  })
})

// ─── PATCH .../approve ────────────────────────────────────────────────────────

describe('PATCH /api/projects/[id]/change-orders/[coId]/approve', () => {
  beforeEach(() => vi.clearAllMocks())

  it('SOCIO aprova CO PENDING e evento CHANGE_ORDER_APPROVED é publicado', async () => {
    mockUser('SOCIO', 'socio-1')
    const pendingCO = {
      id: 'co-1', status: 'PENDING_APPROVAL', createdBy: 'pm-1', projectId: 'proj-1',
      hoursImpact: 8, costImpact: 800, title: 'CO Pendente',
    }
    p().changeOrder.findUnique.mockResolvedValue(pendingCO)
    p().changeOrder.update.mockResolvedValue({
      ...pendingCO, status: 'APPROVED', approvedBy: 'socio-1', approvedAt: new Date(),
      updatedAt: new Date().toISOString(), tasks: [],
      creator: { id: 'pm-1', name: 'PM Test', role: 'PM' },
    })

    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/approve/route')
    const req = new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' } })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('APPROVED')
    expect(EventBus.publish).toHaveBeenCalledWith(
      EventType.CHANGE_ORDER_APPROVED,
      'proj-1',
      expect.objectContaining({ impactHours: 8, projectId: 'proj-1' }),
      'module-11',
    )
  })

  it('CO já APPROVED retorna 409 em nova tentativa', async () => {
    mockUser('SOCIO', 'socio-1')
    p().changeOrder.findUnique.mockResolvedValue({ id: 'co-1', status: 'APPROVED', projectId: 'proj-1' })

    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/approve/route')
    const req = new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' } })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })

    expect(res.status).toBe(409)
  })
})

// ─── PATCH .../reject ─────────────────────────────────────────────────────────

describe('PATCH /api/projects/[id]/change-orders/[coId]/reject', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Rejeição sem reason retorna 422', async () => {
    mockUser('SOCIO', 'socio-1')
    p().changeOrder.findUnique.mockResolvedValue({
      id: 'co-1', status: 'PENDING_APPROVAL', projectId: 'proj-1', createdBy: 'pm-1', title: 'CO Test',
    })

    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/reject/route')
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })

    expect(res.status).toBe(422)
  })

  it('Rejeição válida publica CHANGE_ORDER_REJECTED', async () => {
    mockUser('SOCIO', 'socio-1')
    const pendingCO = {
      id: 'co-1', status: 'PENDING_APPROVAL', createdBy: 'pm-1', projectId: 'proj-1', title: 'CO Test',
    }
    p().changeOrder.findUnique.mockResolvedValue(pendingCO)
    p().changeOrder.update.mockResolvedValue({
      ...pendingCO, status: 'REJECTED', rejectedBy: 'socio-1', rejectedAt: new Date(),
      rejectionReason: 'Não alinhado com escopo',
      hoursImpact: 5, costImpact: 500, updatedAt: new Date().toISOString(), tasks: [],
      creator: { id: 'pm-1', name: 'PM Test', role: 'PM' },
    })

    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/reject/route')
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ reason: 'Não está alinhado com o escopo atual do projeto' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })

    expect(res.status).toBe(200)
    expect(EventBus.publish).toHaveBeenCalledWith(
      EventType.CHANGE_ORDER_REJECTED,
      'proj-1',
      expect.any(Object),
      'module-11',
    )
  })
})

// ─── GET /api/projects/[id]/change-orders/[coId] ─────────────────────────────
// GAP-016: testes ausentes para GET e PATCH individuais

describe('GET /api/projects/[id]/change-orders/[coId]', () => {
  const baseCO = {
    id: 'co-1', projectId: 'proj-1', title: 'CO Test', status: 'APPROVED',
    hoursImpact: 10, costImpact: 1000, createdBy: 'pm-1',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    tasks: [{ taskId: 'task-1' }],
    creator: { id: 'pm-1', name: 'PM Test', role: 'PM' },
  }

  beforeEach(() => vi.clearAllMocks())

  it('PM recebe CO com todos os campos financeiros', async () => {
    mockUser('PM', 'pm-1')
    p().changeOrder.findUnique.mockResolvedValue(baseCO)

    const { GET } = await import('@/app/api/projects/[id]/change-orders/[coId]/route')
    const req = new Request('http://localhost/api/projects/proj-1/change-orders/co-1')
    const res = await GET(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.impactHours).toBe(10)
    expect(data.impactCost).toBe(1000)
    expect(data.affectedTaskIds).toEqual(['task-1'])
  })

  it('SOCIO recebe CO com todos os campos financeiros', async () => {
    mockUser('SOCIO', 'socio-1')
    p().changeOrder.findUnique.mockResolvedValue(baseCO)

    const { GET } = await import('@/app/api/projects/[id]/change-orders/[coId]/route')
    const req = new Request('http://localhost/api/projects/proj-1/change-orders/co-1')
    const res = await GET(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.impactCost).toBe(1000)
  })

  it('CLIENTE recebe 403 se CO não está APPROVED', async () => {
    mockUser('CLIENTE', 'cliente-1')
    p().changeOrder.findUnique.mockResolvedValue({ ...baseCO, status: 'PENDING_APPROVAL' })

    const { GET } = await import('@/app/api/projects/[id]/change-orders/[coId]/route')
    const req = new Request('http://localhost/api/projects/proj-1/change-orders/co-1')
    const res = await GET(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })

    expect(res.status).toBe(403)
  })

  it('DEV recebe CO sem campos financeiros (impactHours, impactCost ausentes)', async () => {
    mockUser('DEV', 'dev-1')
    p().changeOrder.findUnique.mockResolvedValue(baseCO)

    const { GET } = await import('@/app/api/projects/[id]/change-orders/[coId]/route')
    const req = new Request('http://localhost/api/projects/proj-1/change-orders/co-1')
    const res = await GET(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.impactHours).toBeUndefined()
    expect(data.impactCost).toBeUndefined()
  })
})

// ─── PATCH /api/projects/[id]/change-orders/[coId] ───────────────────────────

describe('PATCH /api/projects/[id]/change-orders/[coId]', () => {
  const draftCO = {
    id: 'co-1', projectId: 'proj-1', status: 'DRAFT', createdBy: 'pm-1', hoursImpact: 8,
  }

  beforeEach(() => vi.clearAllMocks())

  it('PM edita própria CO em DRAFT com sucesso', async () => {
    mockUser('PM', 'pm-1')
    setupProject()
    p().changeOrder.findUnique.mockResolvedValue(draftCO)
    p().task.findMany.mockResolvedValue([])
    p().changeOrder.update.mockResolvedValue({
      ...draftCO, title: 'Título Atualizado', hoursImpact: 8, costImpact: 800,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      tasks: [], creator: { id: 'pm-1', name: 'PM Test', role: 'PM' },
    })

    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/route')
    const req = new Request('http://localhost/api/projects/proj-1/change-orders/co-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Título Atualizado' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.title).toBe('Título Atualizado')
  })

  it('PATCH em CO com status PENDING_APPROVAL retorna 409', async () => {
    mockUser('PM', 'pm-1')
    p().changeOrder.findUnique.mockResolvedValue({ ...draftCO, status: 'PENDING_APPROVAL' })

    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/route')
    const req = new Request('http://localhost/api/projects/proj-1/change-orders/co-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Tentativa' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })

    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error.code).toBe('CO_050')
  })

  it('PM diferente do criador recebe 403 ao tentar editar CO', async () => {
    mockUser('PM', 'pm-outro')
    p().changeOrder.findUnique.mockResolvedValue({ ...draftCO, createdBy: 'pm-1' })

    const { PATCH } = await import('@/app/api/projects/[id]/change-orders/[coId]/route')
    const req = new Request('http://localhost/api/projects/proj-1/change-orders/co-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Tentativa' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'proj-1', coId: 'co-1' }) })

    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error.code).toBe('CO_001')
  })
})
