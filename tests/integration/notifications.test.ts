/**
 * Integration Tests: Notifications — API Route Handler
 *
 * GET /api/notifications — lista notificações do usuário
 *
 * Nota: rota usa withAuth HOF que chama getAuthUser() de @/lib/auth.
 * Auth mockada; Prisma real.
 *
 * Ref: RF08, US-018, US-019
 * Error codes: AUTH_001, NOTIF_001
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole, NotificationChannel, NotificationPriority } from '@prisma/client'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'
import {
  createTestOrg,
  createTestUser,
  cleanTestOrg,
} from './helpers/factory.helper'

// ─── MOCK AUTH ────────────────────────────────────────────────────────────────
// notifications/route.ts usa withAuth HOF que chama getAuthUser de @/lib/auth

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
  getAuthUserOrNull: vi.fn(),
}))

import { getAuthUser } from '@/lib/auth'
const mockGetAuthUser = vi.mocked(getAuthUser)

// ─── ROUTE HANDLERS ───────────────────────────────────────────────────────────
import { GET } from '@/app/api/notifications/route'

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

let orgId: string
let userId: string
let otherUserId: string

beforeAll(async () => {
  const org = await createTestOrg({ name: 'Notifications Test Org', slug: 'notif-test-org' })
  orgId = org.id

  const user = await createTestUser(orgId, UserRole.PM, { email: 'pm@notif.test' })
  userId = user.id

  const other = await createTestUser(orgId, UserRole.DEV, { email: 'dev@notif.test' })
  otherUserId = other.id
})

afterAll(async () => {
  await cleanTestOrg(orgId)
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function makeGetReq(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/notifications')
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), { method: 'GET' })
}

function buildUser(id: string, role: UserRole) {
  return { id, organizationId: orgId, role, email: `${role.toLowerCase()}@notif.test`, name: `${role} Test`, avatarUrl: null, mfaEnabled: false, createdAt: new Date().toISOString() }
}

async function createNotification(uid: string, isRead = false) {
  return prisma.notification.create({
    data: {
      id: randomUUID(),
      userId: uid,
      type: 'SYSTEM_ALERT',
      channel: NotificationChannel.IN_APP,
      priority: NotificationPriority.MEDIUM,
      payload: { title: 'Teste', message: 'Notificação de integração' },
      isRead,
    },
  })
}

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('GET /api/notifications', () => {
  it('[1] retorna notificações do usuário autenticado', async () => {
    mockGetAuthUser.mockResolvedValue(buildUser(userId, UserRole.PM) as never)

    const notif1 = await createNotification(userId)
    const notif2 = await createNotification(userId)

    const req = makeGetReq()
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toBeDefined()
    expect(Array.isArray(body.data)).toBe(true)
    const ids = body.data.map((n: { id: string }) => n.id)
    expect(ids).toContain(notif1.id)
    expect(ids).toContain(notif2.id)

    await prisma.notification.deleteMany({ where: { id: { in: [notif1.id, notif2.id] } } })
  })

  it('[1] filtra notificações não lidas (unread=true)', async () => {
    mockGetAuthUser.mockResolvedValue(buildUser(userId, UserRole.PM) as never)

    const unread = await createNotification(userId, false)
    const read = await createNotification(userId, true)

    const req = makeGetReq({ unread: 'true' })
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    const ids = body.data.map((n: { id: string }) => n.id)
    expect(ids).toContain(unread.id)
    expect(ids).not.toContain(read.id)

    await prisma.notification.deleteMany({ where: { id: { in: [unread.id, read.id] } } })
  })

  it('[3] retorna 401 sem autenticação (AUTH_001)', async () => {
    mockGetAuthUser.mockRejectedValue(
      Object.assign(new Error('Não autenticado'), { code: 'AUTH_001', statusCode: 401 }),
    )

    const req = makeGetReq()
    const res = await GET(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('AUTH_001')
  })

  it('[4] não expõe notificações de outro usuário (isolamento por userId)', async () => {
    mockGetAuthUser.mockResolvedValue(buildUser(userId, UserRole.PM) as never)

    // Criar notificação para outro usuário
    const otherNotif = await createNotification(otherUserId)

    const req = makeGetReq()
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    const ids = body.data.map((n: { id: string }) => n.id)
    // A notificação do outro usuário NÃO deve aparecer
    expect(ids).not.toContain(otherNotif.id)

    await prisma.notification.delete({ where: { id: otherNotif.id } })
  })
})
