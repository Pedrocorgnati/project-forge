/**
 * Integration Tests: Change Orders — API Route Handlers
 *
 * GET  /api/projects/[id]/change-orders
 * POST /api/projects/[id]/change-orders
 *
 * Ref: ScopeShield (RF03), US-011, US-012
 * Segurança: IDOR (THREAT-001), RBAC por role
 * Error Codes: CO_001, CO_050, CO_080, AUTH_003, AUTH_005, VAL_001-004
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole, ChangeOrderStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  createTestOrg,
  createTestUser,
  createTestProject,
  addProjectMember,
  cleanTestOrg,
} from './helpers/factory.helper'

// ─── MOCK AUTH ────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: vi.fn(),
  requireServerUser: vi.fn(),
}))

// Mock EventBus para evitar side effects em testes
vi.mock('@/lib/events/bus', () => ({
  EventBus: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
}))

import { getServerUser } from '@/lib/auth/get-user'
const mockGetServerUser = vi.mocked(getServerUser)

// ─── ROUTE HANDLERS ───────────────────────────────────────────────────────────
import { GET, POST } from '@/app/api/projects/[id]/change-orders/route'

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

let orgId: string
let pmId: string
let devId: string
let clienteId: string
let projectId: string

beforeAll(async () => {
  const org = await createTestOrg({ name: 'CO Test Org', slug: 'co-test-org' })
  orgId = org.id

  const pm = await createTestUser(orgId, UserRole.PM, { email: 'pm@co.test' })
  pmId = pm.id

  const dev = await createTestUser(orgId, UserRole.DEV, { email: 'dev@co.test' })
  devId = dev.id

  const cliente = await createTestUser(orgId, UserRole.CLIENTE, { email: 'cliente@co.test' })
  clienteId = cliente.id

  const project = await createTestProject(orgId, { name: 'Projeto Change Orders' })
  await addProjectMember(project.id, pmId, UserRole.PM)
  await addProjectMember(project.id, devId, UserRole.DEV)
  await addProjectMember(project.id, clienteId, UserRole.CLIENTE)
  projectId = project.id
})

afterAll(async () => {
  await cleanTestOrg(orgId)
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function makeGetReq(pid: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/projects/${pid}/change-orders`, { method: 'GET' })
}

function makePostReq(pid: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/projects/${pid}/change-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function buildUser(id: string, role: UserRole) {
  return { id, organizationId: orgId, role, email: `${role.toLowerCase()}@co.test`, name: `${role} Test`, avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString() }
}

const validCOPayload = {
  title: 'Novo Módulo de Relatórios',
  description: 'Adicionar módulo completo de relatórios gerenciais com 3 dashboards personalizados e exportação PDF.',
  impactHours: 40,
  impactCost: 8400,
}

// ─── GET /api/projects/[id]/change-orders ─────────────────────────────────────

describe('GET /api/projects/[id]/change-orders', () => {
  it('[1] PM lista todos os change orders do projeto', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    // Criar CO direto no banco para listar
    const co = await prisma.changeOrder.create({
      data: {
        id: require('crypto').randomUUID(),
        projectId,
        createdBy: pmId,
        title: 'CO para Listar',
        description: 'Descrição do CO para teste de listagem.',
        status: ChangeOrderStatus.DRAFT,
        impactHours: 10,
        impactCost: 2100,
      },
    })

    const req = makeGetReq(projectId)
    const res = await GET(req, { params: Promise.resolve({ id: projectId }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toBeDefined()
    expect(Array.isArray(body.data)).toBe(true)
    const found = body.data.find((c: { id: string }) => c.id === co.id)
    expect(found).toBeDefined()

    await prisma.changeOrder.delete({ where: { id: co.id } })
  })

  it('[1] CLIENTE vê apenas COs com status APPROVED', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(clienteId, UserRole.CLIENTE) as never)

    const approved = await prisma.changeOrder.create({
      data: {
        id: require('crypto').randomUUID(),
        projectId,
        createdBy: pmId,
        title: 'CO Aprovado Cliente',
        description: 'CO aprovado visível ao cliente para teste.',
        status: ChangeOrderStatus.APPROVED,
        impactHours: 5,
        impactCost: 1050,
      },
    })
    const draft = await prisma.changeOrder.create({
      data: {
        id: require('crypto').randomUUID(),
        projectId,
        createdBy: pmId,
        title: 'CO Draft Cliente',
        description: 'CO draft não visível ao cliente.',
        status: ChangeOrderStatus.DRAFT,
        impactHours: 5,
        impactCost: 1050,
      },
    })

    const req = makeGetReq(projectId)
    const res = await GET(req, { params: Promise.resolve({ id: projectId }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    const ids = body.data.map((c: { id: string }) => c.id)
    expect(ids).toContain(approved.id)
    expect(ids).not.toContain(draft.id)

    await prisma.changeOrder.deleteMany({ where: { id: { in: [approved.id, draft.id] } } })
  })

  it('[3] retorna 401 sem autenticação', async () => {
    mockGetServerUser.mockResolvedValue(null as never)

    const req = makeGetReq(projectId)
    const res = await GET(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(401)
  })
})

// ─── POST /api/projects/[id]/change-orders ────────────────────────────────────

describe('POST /api/projects/[id]/change-orders', () => {
  it('[1] PM cria change order com status DRAFT e persiste no banco', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const req = makePostReq(projectId, validCOPayload)
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data).toBeDefined()
    expect(body.data.status).toBe(ChangeOrderStatus.DRAFT)
    expect(body.data.title).toBe(validCOPayload.title)

    // Verificar no banco
    const dbCO = await prisma.changeOrder.findUnique({ where: { id: body.data.id } })
    expect(dbCO).not.toBeNull()
    expect(dbCO!.projectId).toBe(projectId)
    expect(dbCO!.createdBy).toBe(pmId)

    await prisma.changeOrder.delete({ where: { id: body.data.id } })
  })

  it('[2] rejeita description menor que 10 caracteres (VAL_004)', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const req = makePostReq(projectId, {
      ...validCOPayload,
      description: 'Curto',
    })
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toMatch(/VAL_00/)
  })

  it('[2] rejeita impactHours negativo (VAL_003)', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const req = makePostReq(projectId, {
      ...validCOPayload,
      impactHours: -10,
    })
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(422)
  })

  it('[3] retorna 401 sem autenticação', async () => {
    mockGetServerUser.mockResolvedValue(null as never)

    const req = makePostReq(projectId, validCOPayload)
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(401)
  })

  it('[3] DEV não pode criar change order (AUTH_005 — role insuficiente)', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(devId, UserRole.DEV) as never)

    const req = makePostReq(projectId, validCOPayload)
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toMatch(/AUTH_005|AUTH_003/)
  })

  it('[4] não cria CO em projeto de outra organização (IDOR)', async () => {
    const otherOrg = await createTestOrg({ name: 'Other Org CO IDOR', slug: 'other-org-co-idor' })
    const otherPm = await createTestUser(otherOrg.id, UserRole.PM)
    const otherProject = await createTestProject(otherOrg.id, { name: 'Projeto IDOR CO' })
    await addProjectMember(otherProject.id, otherPm.id, UserRole.PM)

    // PM da org principal tenta criar CO em projeto de outra org
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const req = makePostReq(otherProject.id, validCOPayload)
    const res = await POST(req, { params: Promise.resolve({ id: otherProject.id }) })

    expect(res.status).toBe(403)

    // Verificar que nenhum CO foi criado no banco
    const count = await prisma.changeOrder.count({ where: { projectId: otherProject.id } })
    expect(count).toBe(0)

    // Cleanup
    await prisma.projectMember.deleteMany({ where: { projectId: otherProject.id } })
    await prisma.project.delete({ where: { id: otherProject.id } })
    await prisma.user.delete({ where: { id: otherPm.id } })
    await prisma.organization.delete({ where: { id: otherOrg.id } })
  })
})
