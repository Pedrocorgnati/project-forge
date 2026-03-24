/**
 * Integration Tests: Approvals — API Route Handler
 *
 * GET  /api/projects/[id]/approvals
 * POST /api/projects/[id]/approvals
 *
 * Auth mockada; Prisma real.
 *
 * Ref: ClientPortal (RF06), US-014
 * Error codes: APPROVAL_001, AUTH_003, AUTH_005, VAL_001-002
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'
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

vi.mock('@/lib/events/bus', () => ({
  EventBus: { publish: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/lib/approvals/log-history', () => ({
  logApprovalHistory: vi.fn().mockResolvedValue(undefined),
}))

import { getServerUser } from '@/lib/auth/get-user'
const mockGetServerUser = vi.mocked(getServerUser)

// ─── ROUTE HANDLERS ───────────────────────────────────────────────────────────
import { GET, POST } from '@/app/api/projects/[id]/approvals/route'

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

let orgId: string
let pmId: string
let devId: string
let clienteId: string
let projectId: string
let clientAccessId!: string

beforeAll(async () => {
  const org = await createTestOrg({ name: 'Approvals Test Org', slug: 'approvals-test-org' })
  orgId = org.id

  const pm = await createTestUser(orgId, UserRole.PM, { email: 'pm@approvals.test' })
  pmId = pm.id

  const dev = await createTestUser(orgId, UserRole.DEV, { email: 'dev@approvals.test' })
  devId = dev.id

  const cliente = await createTestUser(orgId, UserRole.CLIENTE, { email: 'cliente@approvals.test' })
  clienteId = cliente.id

  const project = await createTestProject(orgId, { name: 'Projeto Approvals' })
  await addProjectMember(project.id, pmId, UserRole.PM)
  await addProjectMember(project.id, devId, UserRole.DEV)
  await addProjectMember(project.id, clienteId, UserRole.CLIENTE)
  projectId = project.id

  // Criar ClientAccess necessário para aprovações
  const ca = await prisma.clientAccess.create({
    data: {
      id: randomUUID(),
      projectId,
      userId: clienteId,
      status: 'ACTIVE',
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })
  clientAccessId = ca.id
})

afterAll(async () => {
  await cleanTestOrg(orgId)
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function makeGetReq(pid: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/projects/${pid}/approvals`, { method: 'GET' })
}

function makePostReq(pid: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/projects/${pid}/approvals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function buildUser(id: string, role: UserRole) {
  return { id, organizationId: orgId, role, email: `${role.toLowerCase()}@approvals.test`, name: `${role} Test`, avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString() }
}

const validApprovalPayload = {
  type: 'DOCUMENT',
  title: 'Aprovação do PRD v2',
  description: 'Solicitação de aprovação formal do PRD versão 2 atualizado conforme feedback.',
  clientAccessId,
}

// ─── GET /api/projects/[id]/approvals ─────────────────────────────────────────

describe('GET /api/projects/[id]/approvals', () => {
  it('[1] PM lista aprovações do projeto', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const req = makeGetReq(projectId)
    const res = await GET(req, { params: Promise.resolve({ id: projectId }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toBeDefined()
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('[3] retorna 401 sem autenticação', async () => {
    mockGetServerUser.mockResolvedValue(null as never)

    const req = makeGetReq(projectId)
    const res = await GET(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(401)
  })
})

// ─── POST /api/projects/[id]/approvals ────────────────────────────────────────

describe('POST /api/projects/[id]/approvals', () => {
  it('[1] PM cria aprovação e persiste no banco', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const payload = { ...validApprovalPayload, clientAccessId }
    const req = makePostReq(projectId, payload)
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data).toBeDefined()
    expect(body.data.title).toBe(payload.title)
    expect(body.data.status).toBe('PENDING')

    // Verificar no banco
    const dbApproval = await prisma.approvalRequest.findUnique({ where: { id: body.data.id } })
    expect(dbApproval).not.toBeNull()
    expect(dbApproval!.projectId).toBe(projectId)

    await prisma.approvalRequest.delete({ where: { id: body.data.id } })
  })

  it('[2] rejeita título com menos de 3 caracteres (VAL_004)', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const req = makePostReq(projectId, {
      ...validApprovalPayload,
      clientAccessId,
      title: 'AB',
    })
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(422)
  })

  it('[2] rejeita type inválido (VAL_002)', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(pmId, UserRole.PM) as never)

    const req = makePostReq(projectId, {
      ...validApprovalPayload,
      clientAccessId,
      type: 'INVALID_TYPE',
    })
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(422)
  })

  it('[3] retorna 401 sem autenticação', async () => {
    mockGetServerUser.mockResolvedValue(null as never)

    const req = makePostReq(projectId, { ...validApprovalPayload, clientAccessId })
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(401)
  })

  it('[3] DEV não pode criar aprovação (AUTH_005)', async () => {
    mockGetServerUser.mockResolvedValue(buildUser(devId, UserRole.DEV) as never)

    const req = makePostReq(projectId, { ...validApprovalPayload, clientAccessId })
    const res = await POST(req, { params: Promise.resolve({ id: projectId }) })

    expect(res.status).toBe(403)
  })
})
