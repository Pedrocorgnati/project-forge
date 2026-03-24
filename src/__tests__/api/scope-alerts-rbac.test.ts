// ─── SCOPE ALERTS RBAC TESTS ──────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-4 / ST003
// Rastreabilidade: INT-070

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── MOCKS ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    scopeAlert: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    task: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/services/scope-alert-service', () => ({
  ScopeAlertService: vi.fn().mockImplementation(function () {
    return { validateAndCreateAlerts: vi.fn().mockResolvedValue(undefined) }
  }),
}))

// ─── IMPORTS ──────────────────────────────────────────────────────────────────

import { GET, POST } from '@/app/api/projects/[id]/scope-alerts/route'
import { PATCH } from '@/app/api/projects/[id]/scope-alerts/[alertId]/route'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function makeParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) }
}

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any)
}

function makeUser(role: string) {
  return {
    id: `user-${role.toLowerCase()}`,
    role,
    email: `${role.toLowerCase()}@test.com`,
    organizationId: 'org-1',
    name: `${role} User`,
    avatarUrl: null,
    mfaEnabled: false,
    createdAt: new Date().toISOString(),
  } as any
}

const PROJECT_ID = '00000000-0000-0000-0000-000000000001'
const ALERT_ID = '00000000-0000-0000-0000-000000000002'

// ─── GET /scope-alerts ────────────────────────────────────────────────────────

describe('GET /api/projects/[id]/scope-alerts — RBAC', () => {
  beforeEach(() => vi.clearAllMocks())

  it('[ERROR] CLIENTE recebe 403', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('CLIENTE'))
    const res = await GET(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts`),
      makeParams({ id: PROJECT_ID }),
    )
    expect(res.status).toBe(403)
  })

  it('[SUCCESS] DEV pode listar alertas (200)', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('DEV'))
    const res = await GET(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts`),
      makeParams({ id: PROJECT_ID }),
    )
    expect(res.status).toBe(200)
  })

  it('[SUCCESS] PM pode listar alertas (200)', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('PM'))
    const res = await GET(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts`),
      makeParams({ id: PROJECT_ID }),
    )
    expect(res.status).toBe(200)
  })

  it('[SUCCESS] SOCIO pode listar alertas (200)', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('SOCIO'))
    const res = await GET(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts`),
      makeParams({ id: PROJECT_ID }),
    )
    expect(res.status).toBe(200)
  })

  it('[ERROR] sem autenticação recebe 401', async () => {
    vi.mocked(getServerUser).mockResolvedValue(null)
    const res = await GET(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts`),
      makeParams({ id: PROJECT_ID }),
    )
    expect(res.status).toBe(401)
  })
})

// ─── POST /scope-alerts (trigger manual) ─────────────────────────────────────

describe('POST /api/projects/[id]/scope-alerts — RBAC trigger manual', () => {
  beforeEach(() => vi.clearAllMocks())

  it('[ERROR] DEV recebe 403 ao tentar trigger manual', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('DEV'))
    const res = await POST(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts`, {
        method: 'POST',
        body: JSON.stringify({ taskId: '00000000-0000-4000-8000-000000000099' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: PROJECT_ID }),
    )
    expect(res.status).toBe(403)
  })

  it('[ERROR] CLIENTE recebe 403 ao tentar trigger manual', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('CLIENTE'))
    const res = await POST(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts`, {
        method: 'POST',
        body: JSON.stringify({ taskId: '00000000-0000-4000-8000-000000000099' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: PROJECT_ID }),
    )
    expect(res.status).toBe(403)
  })

  it('[SUCCESS] PM pode triggar validação manual', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('PM'))
    vi.mocked(prisma.task.findUnique).mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000099',
      projectId: PROJECT_ID,
      title: 'Test Task',
      description: null,
    } as any)

    const res = await POST(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts`, {
        method: 'POST',
        body: JSON.stringify({ taskId: '00000000-0000-4000-8000-000000000099' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: PROJECT_ID }),
    )
    expect(res.status).toBe(200)
  })

  it('[ERROR] PM com taskId inválido (não UUID) recebe 422', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('PM'))
    const res = await POST(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts`, {
        method: 'POST',
        body: JSON.stringify({ taskId: 'not-a-uuid' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: PROJECT_ID }),
    )
    expect(res.status).toBe(422)
  })
})

// ─── PATCH /scope-alerts/[alertId] ───────────────────────────────────────────

describe('PATCH /api/projects/[id]/scope-alerts/[alertId] — RBAC', () => {
  beforeEach(() => vi.clearAllMocks())

  it('[ERROR] DEV recebe 403 ao tentar dismiss', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('DEV'))
    const res = await PATCH(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts/${ALERT_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'dismiss', reason: 'Motivo suficiente (10+ chars)' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: PROJECT_ID, alertId: ALERT_ID }),
    )
    expect(res.status).toBe(403)
  })

  it('[ERROR] CLIENTE recebe 403 ao tentar acknowledge', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('CLIENTE'))
    const res = await PATCH(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts/${ALERT_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'acknowledge' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: PROJECT_ID, alertId: ALERT_ID }),
    )
    expect(res.status).toBe(403)
  })

  it('[SUCCESS] PM pode acknowledge alerta OPEN', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('PM'))
    vi.mocked(prisma.scopeAlert.findFirst).mockResolvedValue({
      id: ALERT_ID,
      projectId: PROJECT_ID,
      status: 'OPEN',
      type: 'SCOPE_CREEP',
    } as any)
    vi.mocked(prisma.scopeAlert.update).mockResolvedValue({
      id: ALERT_ID,
      status: 'ACKNOWLEDGED',
    } as any)

    const res = await PATCH(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts/${ALERT_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'acknowledge' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: PROJECT_ID, alertId: ALERT_ID }),
    )
    expect(res.status).toBe(200)
  })

  it('[ERROR] dismiss sem reason → 422', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('PM'))
    vi.mocked(prisma.scopeAlert.findFirst).mockResolvedValue({
      id: ALERT_ID,
      projectId: PROJECT_ID,
      status: 'OPEN',
    } as any)

    const res = await PATCH(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts/${ALERT_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'dismiss' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: PROJECT_ID, alertId: ALERT_ID }),
    )
    expect(res.status).toBe(422)
  })

  it('[ERROR] alerta DISMISSED → 409 (SCOPE_050)', async () => {
    vi.mocked(getServerUser).mockResolvedValue(makeUser('PM'))
    vi.mocked(prisma.scopeAlert.findFirst).mockResolvedValue({
      id: ALERT_ID,
      projectId: PROJECT_ID,
      status: 'DISMISSED',
    } as any)

    const res = await PATCH(
      makeRequest(`http://localhost/api/projects/${PROJECT_ID}/scope-alerts/${ALERT_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'acknowledge' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams({ id: PROJECT_ID, alertId: ALERT_ID }),
    )
    expect(res.status).toBe(409)
  })
})
