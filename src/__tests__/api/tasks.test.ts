// src/__tests__/api/tasks.test.ts
// Testes de API para endpoints de Task (module-9-scopeshield-board)
// Rastreabilidade INTAKE: INT-060

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    task: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
      delete:    vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: vi.fn().mockResolvedValue({ projectRole: 'PM' }),
}))

vi.mock('@/lib/events', () => ({
  EventBus: { publish: vi.fn() },
}))

// ─── Importações após mocks ───────────────────────────────────────────────────

import { GET, POST } from '@/app/api/projects/[id]/tasks/route'
import { PATCH, DELETE } from '@/app/api/projects/[id]/tasks/[taskId]/route'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { EventBus } from '@/lib/events'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) }
}

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any)
}

// ─── GET /api/projects/[id]/tasks ────────────────────────────────────────────

describe('GET /api/projects/[id]/tasks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna 401 se não autenticado', async () => {
    vi.mocked(getServerUser).mockResolvedValue(null)
    const res = await GET(
      makeRequest('http://localhost/api/projects/proj-1/tasks'),
      makeParams({ id: 'proj-1' }),
    )
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_001')
  })

  it('retorna lista de tasks para usuário autenticado', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'pm-1', role: 'PM', email: 'pm@test.com', organizationId: 'org-1',
      name: 'PM User', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any)

    const mockTasks = [
      { id: 'task-1', title: 'Task 1', status: 'TODO', priority: 'P2', projectId: 'proj-1' },
    ]
    vi.mocked(prisma.task.findMany).mockResolvedValue(mockTasks as any)

    const res = await GET(
      makeRequest('http://localhost/api/projects/proj-1/tasks'),
      makeParams({ id: 'proj-1' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('task-1')
  })
})

// ─── POST /api/projects/[id]/tasks ───────────────────────────────────────────

describe('POST /api/projects/[id]/tasks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna 403 para CLIENTE', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'cliente-1', role: 'CLIENTE', email: 'c@test.com', organizationId: 'org-1',
      name: null, avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any)

    const res = await POST(
      makeRequest('http://localhost/api/projects/proj-1/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nova task' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1' }),
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_003')
  })

  it('retorna 422 com título vazio', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'pm-1', role: 'PM', email: 'pm@test.com', organizationId: 'org-1',
      name: 'PM', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any)

    const res = await POST(
      makeRequest('http://localhost/api/projects/proj-1/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: '' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1' }),
    )
    expect(res.status).toBe(422)
  })

  it('cria task com PM e publica TASK_CREATED', async () => {
    const pmUser = {
      id: 'pm-1', role: 'PM', email: 'pm@test.com', organizationId: 'org-1',
      name: 'PM', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any
    vi.mocked(getServerUser).mockResolvedValue(pmUser)
    vi.mocked(prisma.task.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.task.create).mockResolvedValue({
      id: 'new-task-1', title: 'Nova task PM', status: 'TODO', priority: 'P1',
      projectId: 'proj-1', createdBy: 'pm-1', position: 0, assignee: null,
    } as any)

    const res = await POST(
      makeRequest('http://localhost/api/projects/proj-1/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nova task PM', priority: 'P1' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1' }),
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.title).toBe('Nova task PM')
    expect(EventBus.publish).toHaveBeenCalled()
  })
})

// ─── PATCH /api/projects/[id]/tasks/[taskId] — RBAC granular ─────────────────

describe('PATCH /api/projects/[id]/tasks/[taskId] — RBAC', () => {
  beforeEach(() => vi.clearAllMocks())

  const existingTask = {
    id: 'task-1', projectId: 'proj-1', title: 'Task existente',
    status: 'TODO', assigneeId: 'dev-2', createdBy: 'pm-1', priority: 'P2',
  }

  it('retorna 403 para CLIENTE tentando editar', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'cliente-1', role: 'CLIENTE', email: 'c@test.com', organizationId: 'org-1',
      name: null, avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(existingTask as any)

    const res = await PATCH(
      makeRequest('http://localhost/api/projects/proj-1/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Hacked' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1', taskId: 'task-1' }),
    )
    expect(res.status).toBe(403)
  })

  it('DEV não pode editar title — campo restrito a PM/SOCIO', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'dev-1', role: 'DEV', email: 'd@test.com', organizationId: 'org-1',
      name: 'Dev', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(existingTask as any)

    const res = await PATCH(
      makeRequest('http://localhost/api/projects/proj-1/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Novo título' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1', taskId: 'task-1' }),
    )
    // DEV tentando editar somente title não tem campos permitidos → 403
    expect(res.status).toBe(403)
  })

  it('PM pode atualizar status e publica TASK_STATUS_CHANGED', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'pm-1', role: 'PM', email: 'pm@test.com', organizationId: 'org-1',
      name: 'PM', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(existingTask as any)
    vi.mocked(prisma.task.update).mockResolvedValue({
      ...existingTask, status: 'IN_PROGRESS', assignee: null,
    } as any)

    const res = await PATCH(
      makeRequest('http://localhost/api/projects/proj-1/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1', taskId: 'task-1' }),
    )
    expect(res.status).toBe(200)
    expect(EventBus.publish).toHaveBeenCalledTimes(2) // TASK_UPDATED + TASK_STATUS_CHANGED
  })

  it('DEV pode atualizar status da própria task (assigneeId === userId)', async () => {
    const devUser = {
      id: 'dev-2', role: 'DEV', email: 'd2@test.com', organizationId: 'org-1',
      name: 'Dev 2', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any
    vi.mocked(getServerUser).mockResolvedValue(devUser)

    // Task assigned to dev-2 (same as user.id)
    const ownTask = {
      id: 'task-1', projectId: 'proj-1', title: 'Task existente',
      status: 'TODO', assigneeId: 'dev-2', createdBy: 'pm-1', priority: 'P2',
    }
    vi.mocked(prisma.task.findUnique).mockResolvedValue(ownTask as any)
    vi.mocked(prisma.task.update).mockResolvedValue({
      ...ownTask, status: 'IN_PROGRESS', assignee: null,
    } as any)

    const res = await PATCH(
      makeRequest('http://localhost/api/projects/proj-1/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1', taskId: 'task-1' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('IN_PROGRESS')
    expect(EventBus.publish).toHaveBeenCalled()
  })

  it('DEV NÃO pode atualizar status de task de outro dev', async () => {
    const devUser = {
      id: 'dev-1', role: 'DEV', email: 'd1@test.com', organizationId: 'org-1',
      name: 'Dev 1', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any
    vi.mocked(getServerUser).mockResolvedValue(devUser)

    // Task assigned to dev-2, but user is dev-1
    const otherTask = {
      id: 'task-1', projectId: 'proj-1', title: 'Task existente',
      status: 'TODO', assigneeId: 'dev-2', createdBy: 'pm-1', priority: 'P2',
    }
    vi.mocked(prisma.task.findUnique).mockResolvedValue(otherTask as any)

    const res = await PATCH(
      makeRequest('http://localhost/api/projects/proj-1/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1', taskId: 'task-1' }),
    )
    // DEV trying to update status of another dev's task → only position allowed → 403
    expect(res.status).toBe(403)
  })

  it('retorna 404 para task inexistente', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'pm-1', role: 'PM', email: 'pm@test.com', organizationId: 'org-1',
      name: 'PM', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null)

    const res = await PATCH(
      makeRequest('http://localhost/api/projects/proj-1/tasks/nao-existe', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DONE' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: 'proj-1', taskId: 'nao-existe' }),
    )
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('TASK_080')
  })
})

// ─── DELETE /api/projects/[id]/tasks/[taskId] ────────────────────────────────

describe('DELETE /api/projects/[id]/tasks/[taskId]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna 403 para DEV', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'dev-1', role: 'DEV', email: 'd@test.com', organizationId: 'org-1',
      name: 'Dev', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any)

    const res = await DELETE(
      makeRequest('http://localhost/api/projects/proj-1/tasks/task-1', { method: 'DELETE' }),
      makeParams({ id: 'proj-1', taskId: 'task-1' }),
    )
    expect(res.status).toBe(403)
  })

  it('PM pode deletar task existente', async () => {
    vi.mocked(getServerUser).mockResolvedValue({
      id: 'pm-1', role: 'PM', email: 'pm@test.com', organizationId: 'org-1',
      name: 'PM', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString(),
    } as any)
    vi.mocked(prisma.task.findUnique).mockResolvedValue({ id: 'task-1', projectId: 'proj-1' } as any)
    vi.mocked(prisma.task.delete).mockResolvedValue({} as any)

    const res = await DELETE(
      makeRequest('http://localhost/api/projects/proj-1/tasks/task-1', { method: 'DELETE' }),
      makeParams({ id: 'proj-1', taskId: 'task-1' }),
    )
    expect(res.status).toBe(204)
  })
})
