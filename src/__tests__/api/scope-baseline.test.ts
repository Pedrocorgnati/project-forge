// src/__tests__/api/scope-baseline.test.ts
// Testes de API para ScopeBaseline (module-9-scopeshield-board)
// Rastreabilidade INTAKE: INT-060

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    task: {
      findMany: vi.fn(),
    },
    scopeBaseline: {
      create:   vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: vi.fn().mockResolvedValue({ projectRole: 'PM' }),
}))

// ─── Importações após mocks ───────────────────────────────────────────────────

import { GET, POST } from '@/app/api/projects/[id]/scope-baseline/route'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) }
}

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any)
}

function makePMUser() {
  return {
    id: 'pm-1', role: 'PM', email: 'pm@test.com', organizationId: 'org-1',
    name: 'PM User', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
  } as any
}

// ─── POST /api/projects/[id]/scope-baseline ───────────────────────────────────

describe('POST /api/projects/[id]/scope-baseline', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna 401 se não autenticado', async () => {
    vi.mocked(getServerUser).mockResolvedValue(null)
    const res = await POST(
      makeRequest('http://localhost/api/projects/proj-1/scope-baseline', {
        method: 'POST',
        body: JSON.stringify({ name: 'Sprint 1 Baseline' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1' }),
    )
    expect(res.status).toBe(401)
  })

  it('retorna 403 para DEV', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'dev-1', role: 'DEV', email: 'd@test.com', organizationId: 'org-1',
      name: 'Dev', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any)

    const res = await POST(
      makeRequest('http://localhost/api/projects/proj-1/scope-baseline', {
        method: 'POST',
        body: JSON.stringify({ name: 'Baseline dev' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1' }),
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_003')
  })

  it('cria baseline com snapshot imutável das tasks atuais', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makePMUser())

    const currentTasks = [
      { id: 'task-1', title: 'Task A', status: 'TODO', projectId: 'proj-1' },
      { id: 'task-2', title: 'Task B', status: 'IN_PROGRESS', projectId: 'proj-1' },
    ]
    vi.mocked(prisma.task.findMany).mockResolvedValue(currentTasks as any)
    vi.mocked(prisma.scopeBaseline.create).mockResolvedValue({
      id: 'baseline-1',
      projectId: 'proj-1',
      name: 'Sprint 1 Baseline',
      description: null,
      taskCount: 2,
      createdBy: 'pm-1',
      createdAt: new Date(),
    } as any)

    const res = await POST(
      makeRequest('http://localhost/api/projects/proj-1/scope-baseline', {
        method: 'POST',
        body: JSON.stringify({ name: 'Sprint 1 Baseline' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1' }),
    )

    expect(res.status).toBe(201)
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 'proj-1' } }),
    )

    // Verificar que create foi chamado com snapshot + taskCount correto
    expect(prisma.scopeBaseline.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskCount: 2,
          name: 'Sprint 1 Baseline',
          createdBy: 'pm-1',
        }),
      }),
    )
  })

  it('retorna 422 com nome vazio', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makePMUser())

    const res = await POST(
      makeRequest('http://localhost/api/projects/proj-1/scope-baseline', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1' }),
    )
    expect(res.status).toBe(422)
  })
})

// ─── GET /api/projects/[id]/scope-baseline ────────────────────────────────────

describe('GET /api/projects/[id]/scope-baseline', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna 403 para CLIENTE', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'cliente-1', role: 'CLIENTE', email: 'c@test.com', organizationId: 'org-1',
      name: null, avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any)

    const res = await GET(
      makeRequest('http://localhost/api/projects/proj-1/scope-baseline'),
      makeParams({ id: 'proj-1' }),
    )
    expect(res.status).toBe(403)
  })

  it('retorna lista de baselines sem campo snapshot para PM', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makePMUser())

    const baselines = [
      { id: 'b-1', name: 'Sprint 1', description: null, taskCount: 5, createdBy: 'pm-1', createdAt: new Date() },
      { id: 'b-2', name: 'Sprint 2', description: 'desc', taskCount: 8, createdBy: 'pm-1', createdAt: new Date() },
      { id: 'b-3', name: 'Sprint 3', description: null, taskCount: 3, createdBy: 'pm-1', createdAt: new Date() },
    ]
    vi.mocked(prisma.scopeBaseline.findMany).mockResolvedValue(baselines as any)

    const res = await GET(
      makeRequest('http://localhost/api/projects/proj-1/scope-baseline'),
      makeParams({ id: 'proj-1' }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(3)
    // snapshot NÃO deve aparecer em nenhum item
    body.forEach((item: any) => {
      expect(item.snapshot).toBeUndefined()
    })
  })
})
