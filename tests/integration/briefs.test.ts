/**
 * Integration Tests: Briefs — API Route Handler
 *
 * POST /api/briefs — cria brief para projeto existente.
 * Auth mockada; Prisma real.
 *
 * Ref: BriefForge (RF01), US-001
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
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

import { getServerUser } from '@/lib/auth/get-user'
const mockGetServerUser = vi.mocked(getServerUser)

// ─── ROUTE HANDLER ────────────────────────────────────────────────────────────
import { POST } from '@/app/api/briefs/route'

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

let orgId: string
let pmId: string
let devId: string
let projectId: string

beforeAll(async () => {
  const org = await createTestOrg({ name: 'Briefs Test Org', slug: 'briefs-test-org' })
  orgId = org.id

  const pm = await createTestUser(orgId, UserRole.PM, { email: 'pm@briefs.test' })
  pmId = pm.id

  const dev = await createTestUser(orgId, UserRole.DEV, { email: 'dev@briefs.test' })
  devId = dev.id

  const project = await createTestProject(orgId, { name: 'Projeto BriefForge' })
  await addProjectMember(project.id, pmId, UserRole.PM)
  await addProjectMember(project.id, devId, UserRole.DEV)
  projectId = project.id
})

afterAll(async () => {
  await cleanTestOrg(orgId)
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/briefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function buildPmUser() {
  return { id: pmId, organizationId: orgId, role: 'PM' as UserRole, email: 'pm@briefs.test', name: 'PM Test', avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString() }
}

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('POST /api/briefs', () => {
  it('[1] PM cria brief para projeto — retorna 201 e persiste no banco', async () => {
    mockGetServerUser.mockResolvedValue(buildPmUser() as never)

    const req = makeRequest({ projectId })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toHaveProperty('data')
    expect(body.data.projectId).toBe(projectId)

    // Verificar no banco
    const dbBrief = await prisma.brief.findUnique({ where: { id: body.data.id } })
    expect(dbBrief).not.toBeNull()
    expect(dbBrief!.projectId).toBe(projectId)

    // Cleanup
    await prisma.brief.delete({ where: { id: body.data.id } })
  })

  it('[2] rejeita projectId inválido (VAL_001 — UUID malformado)', async () => {
    mockGetServerUser.mockResolvedValue(buildPmUser() as never)

    const req = makeRequest({ projectId: 'not-a-uuid' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toMatch(/VAL_001|VAL_002/)
  })

  it('[2] rejeita payload sem projectId (VAL_001 — campo obrigatório)', async () => {
    mockGetServerUser.mockResolvedValue(buildPmUser() as never)

    const req = makeRequest({})
    const res = await POST(req)

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toMatch(/VAL_001/)
  })

  it('[3] retorna 401 para requisição não autenticada', async () => {
    mockGetServerUser.mockResolvedValue(null as never)

    const req = makeRequest({ projectId })
    const res = await POST(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_001')
  })

  it('[3] retorna 403 para DEV tentando criar brief (role insuficiente)', async () => {
    mockGetServerUser.mockResolvedValue({
      id: devId,
      organizationId: orgId,
      role: 'DEV' as UserRole,
      email: 'dev@briefs.test',
      name: 'Dev Test',
      avatarUrl: null,
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
    } as never)

    const req = makeRequest({ projectId })
    const res = await POST(req)

    expect(res.status).toBe(403)
  })

  it('[2] rejeita JSON malformado no body', async () => {
    mockGetServerUser.mockResolvedValue(buildPmUser() as never)

    const req = new NextRequest('http://localhost:3000/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'this is not json {{{',
    })
    const res = await POST(req)

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe('VAL_001')
  })

  it('[4] não cria brief em projeto de outra organização (IDOR)', async () => {
    // Criar projeto em outra org
    const otherOrg = await createTestOrg({ name: 'Other Org Briefs', slug: 'other-org-briefs' })
    const otherPm = await createTestUser(otherOrg.id, UserRole.PM)
    const otherProject = await createTestProject(otherOrg.id, { name: 'Projeto Outra Org' })
    await addProjectMember(otherProject.id, otherPm.id, UserRole.PM)

    // PM da org principal tenta criar brief no projeto da outra org
    mockGetServerUser.mockResolvedValue(buildPmUser() as never)

    const req = makeRequest({ projectId: otherProject.id })
    const res = await POST(req)

    // Deve negar (403) — usuário não é membro do projeto
    expect(res.status).toBeGreaterThanOrEqual(400)

    // Cleanup
    await prisma.projectMember.deleteMany({ where: { projectId: otherProject.id } })
    await prisma.project.delete({ where: { id: otherProject.id } })
    await prisma.user.delete({ where: { id: otherPm.id } })
    await prisma.organization.delete({ where: { id: otherOrg.id } })
  })
})
