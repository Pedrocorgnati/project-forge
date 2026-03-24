// src/app/api/projects/[id]/client-access/[accessId]/__tests__/route.test.ts
// module-16-clientportal-auth / TASK-6 ST001
// Testes para DELETE /api/projects/[id]/client-access/[accessId]
// Rastreabilidade: GAP-013

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    clientAccess: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/constants/errors', () => ({
  ERROR_CODES: {
    AUTH_001: { code: 'AUTH_001', message: 'Não autenticado.' },
    AUTH_003: { code: 'AUTH_003', message: 'Sem permissão.' },
    APPROVAL_081: { code: 'APPROVAL_081', message: 'Não encontrado.' },
    APPROVAL_083: { code: 'APPROVAL_083', message: 'Já revogado.' },
  },
}))

vi.mock('@prisma/client', () => ({
  UserRole: { SOCIO: 'SOCIO', PM: 'PM', DEV: 'DEV', CLIENTE: 'CLIENTE' },
}))

import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { DELETE } from '../route'

const mockGetUser = vi.mocked(getServerUser)
const mockProjectAccess = vi.mocked(withProjectAccess)
const mockFindFirst = vi.mocked(prisma.clientAccess.findFirst)
const mockUpdate = vi.mocked(prisma.clientAccess.update)

const socioUser = { id: 'u1', email: 'socio@test.com', name: 'Socio', role: 'SOCIO' }
const pmUser = { id: 'u3', email: 'pm@test.com', name: 'PM', role: 'PM' }
const devUser = { id: 'u2', email: 'dev@test.com', name: 'Dev', role: 'DEV' }

function makeDeleteReq() {
  return new NextRequest('http://localhost/api/projects/proj-1/client-access/ca-1', {
    method: 'DELETE',
  })
}

function makeParams() {
  return { params: Promise.resolve({ id: 'proj-1', accessId: 'ca-1' }) }
}

describe('DELETE /api/projects/[id]/client-access/[accessId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(socioUser as never)
    mockProjectAccess.mockResolvedValue(undefined as never)
    mockFindFirst.mockResolvedValue({
      id: 'ca-1',
      status: 'PENDING',
      projectId: 'proj-1',
    } as never)
    mockUpdate.mockResolvedValue({ id: 'ca-1', status: 'REVOKED' } as never)
  })

  it('SOCIO revoga acesso PENDING → 200', async () => {
    const res = await DELETE(makeDeleteReq(), makeParams())

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'ca-1' },
      data: expect.objectContaining({ status: 'REVOKED' }),
    })
  })

  it('PM revoga acesso ACTIVE → 200', async () => {
    mockGetUser.mockResolvedValue(pmUser as never)
    mockFindFirst.mockResolvedValue({
      id: 'ca-1',
      status: 'ACTIVE',
      projectId: 'proj-1',
    } as never)

    const res = await DELETE(makeDeleteReq(), makeParams())

    expect(res.status).toBe(200)
  })

  it('DEV tenta revogar → 403', async () => {
    mockGetUser.mockResolvedValue(devUser as never)

    const res = await DELETE(makeDeleteReq(), makeParams())

    expect(res.status).toBe(403)
  })

  it('não autenticado → 401', async () => {
    mockGetUser.mockResolvedValue(null)

    const res = await DELETE(makeDeleteReq(), makeParams())

    expect(res.status).toBe(401)
  })

  it('accessId inexistente → 404', async () => {
    mockFindFirst.mockResolvedValue(null)

    const res = await DELETE(makeDeleteReq(), makeParams())

    expect(res.status).toBe(404)
  })

  it('acesso já revogado → 409', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'ca-1',
      status: 'REVOKED',
      projectId: 'proj-1',
    } as never)

    const res = await DELETE(makeDeleteReq(), makeParams())

    expect(res.status).toBe(409)
  })
})
