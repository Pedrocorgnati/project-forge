/**
 * Integration Tests: Tasks — API Route Handlers
 *
 * GET /api/projects/[id]/tasks
 * POST /api/projects/[id]/tasks
 *
 * Ref: ScopeShield (RF03, RF07), US-009, US-010
 * Segurança: IDOR via projectId no path param (THREAT-001)
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole, TaskStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  createTestOrg,
  createTestUser,
  createTestProject,
  addProjectMember,
  createTestTask,
  cleanTestOrg,
} from './helpers/factory.helper'

// ─── MOCK AUTH ────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: vi.fn(),
  requireServerUser: vi.fn(),
}))

import { getServerUser } from '@/lib/auth/get-user'
const mockGetServerUser = vi.mocked(getServerUser)

// ─── ROUTE HANDLERS ───────────────────────────────────────────────────────────
import { GET, POST } from '@/app/api/projects/[id]/tasks/route'

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

let orgId: string
let pmId: string
let devId: string
let projectId: string
let otherOrgId: string

beforeAll(async () => {
  const org = await createTestOrg({ name: 'Tasks Test Org', slug: 'tasks-test-org' })
  orgId = org.id

  const pm = await createTestUser(orgId, UserRole.PM, { email: 'pm@tasks.test' })
  pmId = pm.id

  const dev = await createTestUser(orgId, UserRole.DEV, { email: 'dev@tasks.test' })
  devId = dev.id

  const project = await createTestProject(orgId, { name: 'Projeto Tasks' })
  await addProjectMember(project.id, pmId, UserRole.PM)
  await addProjectMember(project.id, devId, UserRole.DEV)
  projectId = project.id

  const otherOrg = await createTestOrg({ name: 'Other Org Tasks', slug: 'other-org-tasks' })
  otherOrgId = otherOrg.id
})

afterAll(async () => {
  await cleanTestOrg(orgId)
  await cleanTestOrg(otherOrgId)
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function makeGetRequest(pid: string, params?: Record<string, string>): NextRequest {
  const url = new URL(`http://localhost:3000/api/projects/${pid}/tasks`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), { method: 'GET' })
}

function makePostRequest(pid: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/projects/${pid}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function buildUser(id: string, role: UserRole) {
  return { id, organizationId: orgId, role, email: `${role.toLowerCase()}@tasks.test`, name: `${role} Test`, avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString() }
}

// ─── GET /api/projects/[id]/tasks ─────────────────────────────────────────────

describe('GET /api/projects/[id]/tasks', () => {
  it('[1] retorna lista de tasks do projeto para membro autenticado', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(devId, UserRole.DEV) as never)

    // Criar tasks de teste
    const task1 = await createTestTask(projectId, devId, { title: 'Task Lista 1' })
    const task2 = await createTestTask(projectId, devId, { title: 'Task Lista 2' })

    const req = makeGetRequest(projectId)
    const res = await GET(req, { params: Promise.resolve({ id: projectId }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toBeDefined()
    expect(Array.isArray(body.data)).toBe(true)
    const ids = body.data.map((t: { id: string }) => t.id)
    expect(ids).toContain(task1.id)
    expect(ids).toContain(task2.id)

    await prisma.task.deleteMany({ where: { id: { in: [task1.id, task2.id] } } })
  })

  it('[1] filtra tasks por status', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const done = await createTestTask(projectId, devId, { title: 'Task Done', status: TaskStatus.DONE })
    const todo = await createTestTask(projectId, devId, { title: 'Task Todo', status: TaskStatus.TODO })

    const req = makeGetRequest(projectId, { status: 'DONE' })
    const res = await GET(req, { params: Promise.resolve({ id: projectId }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    const ids = body.data.map((t: { id: string }) => t.id)
    expect(ids).toContain(done.id)
    expect(ids).not.toContain(todo.id)

    await prisma.task.deleteMany({ where: { id: { in: [done.id, todo.id] } } })
  })

  it('[3] retorna 401 sem autenticação', async () => {
    mockGetServerUser.mockResolvedValue(null as never)

    const req = makeGetRequest(projectId)
    const res = await GET(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(401)
  })

  it('[4] IDOR — não expõe tasks de projeto de outra organização', async () => {
    const otherUser = await createTestUser(otherOrgId, UserRole.PM)
    const otherProject = await createTestProject(otherOrgId, { name: 'Projeto IDOR Tasks' })
    await addProjectMember(otherProject.id, otherUser.id, UserRole.PM)
    const otherTask = await createTestTask(otherProject.id, otherUser.id, { title: 'Task IDOR' })

    // Usuário da org principal tenta acessar project da outra org
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const req = makeGetRequest(otherProject.id)
    const res = await GET(req, { params: Promise.resolve({ id: otherProject.id }) })

    // Deve retornar 403 — usuário não é membro do projeto
    expect(res.status).toBe(403)

    // Cleanup
    await prisma.task.delete({ where: { id: otherTask.id } })
    await prisma.projectMember.deleteMany({ where: { projectId: otherProject.id } })
    await prisma.project.delete({ where: { id: otherProject.id } })
    await prisma.user.delete({ where: { id: otherUser.id } })
  })
})

// ─── POST /api/projects/[id]/tasks ────────────────────────────────────────────

describe('POST /api/projects/[id]/tasks', () => {
  it('[1] cria task e persiste no banco', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const payload = {
      title: 'Task Criada via Integração',
      description: 'Descrição da task',
      estimatedHours: 8,
      assigneeId: devId,
    }

    const req = makePostRequest(projectId, payload)
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data).toBeDefined()
    expect(body.data.title).toBe(payload.title)
    expect(body.data.status).toBe(TaskStatus.TODO)

    // Verificar no banco
    const dbTask = await prisma.task.findUnique({ where: { id: body.data.id } })
    expect(dbTask).not.toBeNull()
    expect(dbTask!.projectId).toBe(projectId)

    await prisma.task.delete({ where: { id: body.data.id } })
  })

  it('[2] rejeita título muito curto (VAL_004)', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const req = makePostRequest(projectId, { title: 'AB', estimatedHours: 4 })
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toMatch(/VAL_00/)
  })

  it('[2] rejeita estimatedHours <= 0 (VAL_003)', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const req = makePostRequest(projectId, { title: 'Task Horas Zero', estimatedHours: 0 })
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(422)
  })

  it('[3] retorna 401 sem autenticação', async () => {
    mockGetServerUser.mockResolvedValue(null as never)

    const req = makePostRequest(projectId, { title: 'Task Sem Auth', estimatedHours: 4 })
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(401)
  })

  it('[4] SQL injection no título é sanitizado — banco permanece íntegro', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const maliciousTitle = "'; DROP TABLE tasks; --"
    const req = makePostRequest(projectId, {
      title: maliciousTitle,
      estimatedHours: 1,
    })
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })

    // Se criou, deve ter sanitizado/escapado
    if (res.status === 201) {
      const body = await res.json()
      // Tabela ainda existe — contagem não lança exceção
      const count = await prisma.task.count()
      expect(count).toBeGreaterThanOrEqual(0)
      await prisma.task.delete({ where: { id: body.data.id } })
    } else {
      // Rejeitou corretamente
      expect(res.status).toBeGreaterThanOrEqual(400)
    }
  })
})
