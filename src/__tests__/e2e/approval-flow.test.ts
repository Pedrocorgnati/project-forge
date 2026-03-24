// src/__tests__/e2e/approval-flow.test.ts
// module-17-clientportal-approvals / TASK-8 — GAP-018
// E2E test: fluxo completo de aprovacao (create -> respond -> duplicata -> expirada)

import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── MOCK DO PRISMA ───────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    approvalRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    approvalHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    clientAccess: {
      findFirst: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    clientFeedback: {
      create: vi.fn(),
    },
    event: {
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

// ─── MOCK DO EVENT BUS ───────────────────────────────────────────────────────

vi.mock('@/lib/events/bus', () => ({
  EventBus: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
}))

import { EventBus } from '@/lib/events/bus'

// ─── MOCK DO BROADCASTER ────────────────────────────────────────────────────

vi.mock('@/lib/events/broadcaster', () => ({
  EventBroadcaster: {
    broadcast: vi.fn(),
  },
}))

// ─── MOCK DO VALIDATOR ──────────────────────────────────────────────────────

vi.mock('@/lib/utils/validate', () => ({
  isValidUuid: vi.fn().mockReturnValue(true),
}))

// ─── MOCK AUTH ──────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-pm-001',
  email: 'pm@test.com',
  name: 'PM Test',
  role: 'PM' as const,
}

const mockClientUser = {
  id: 'user-client-001',
  email: 'client@test.com',
  name: 'Client Test',
  role: 'CLIENTE' as const,
}

let currentUser: typeof mockUser | typeof mockClientUser | null = mockUser

vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: vi.fn(() => Promise.resolve(currentUser)),
}))

// ─── MOCK RBAC ──────────────────────────────────────────────────────────────

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: vi.fn().mockResolvedValue(true),
}))

// ─── MOCK LOG HISTORY ───────────────────────────────────────────────────────

vi.mock('@/lib/approvals/log-history', () => ({
  logApprovalHistory: vi.fn().mockResolvedValue({ id: 'history-001' }),
}))

import { logApprovalHistory } from '@/lib/approvals/log-history'

// ─── HELPERS ────────────────────────────────────────────────────────────────

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000'
const CLIENT_ACCESS_ID = '660e8400-e29b-41d4-a716-446655440001'
const APPROVAL_ID = '770e8400-e29b-41d4-a716-446655440002'

const baseApproval = {
  id: APPROVAL_ID,
  projectId: PROJECT_ID,
  clientAccessId: CLIENT_ACCESS_ID,
  requestedBy: mockUser.id,
  type: 'DOCUMENT',
  title: 'Aprovar PRD v2',
  description: 'Aprovacao do PRD versao 2 do projeto',
  documentId: null,
  status: 'PENDING',
  slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
  respondedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  requester: { name: mockUser.name, email: mockUser.email },
  clientAccess: { clientEmail: mockClientUser.email, clientName: mockClientUser.name },
}

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── TESTES ─────────────────────────────────────────────────────────────────

describe('Approval Flow E2E — module-17', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = mockUser
  })

  // ── STEP 1: PM cria aprovacao ──────────────────────────────────────────────

  describe('Step 1: PM creates approval (POST /projects/[id]/approvals)', () => {
    it('retorna 201 com status PENDING e registra historico CREATED', async () => {
      // Arrange
      const mockClientAccess = { id: CLIENT_ACCESS_ID, projectId: PROJECT_ID, status: 'ACTIVE' }
      vi.mocked(prisma.clientAccess.findFirst).mockResolvedValue(mockClientAccess as never)
      vi.mocked(prisma.approvalRequest.create).mockResolvedValue(baseApproval as never)
      vi.mocked(prisma.approvalHistory.create).mockResolvedValue({ id: 'history-001' } as never)

      // Act
      const { POST } = await import(
        '@/app/api/projects/[id]/approvals/route'
      )
      const req = createRequest({
        type: 'DOCUMENT',
        title: 'Aprovar PRD v2',
        description: 'Aprovacao do PRD versao 2 do projeto',
        clientAccessId: CLIENT_ACCESS_ID,
      }) as never

      const res = await POST(req, {
        params: Promise.resolve({ id: PROJECT_ID }),
      })

      // Assert
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.status).toBe('PENDING')
      expect(data.id).toBe(APPROVAL_ID)

      // Step 2: Verify logApprovalHistory called with CREATED
      expect(logApprovalHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalId: APPROVAL_ID,
          action: 'CREATED',
          actorId: mockUser.id,
        }),
      )

      // Step 3: Verify EventBus.publish called with APPROVAL_REQUESTED
      expect(EventBus.publish).toHaveBeenCalledWith(
        'APPROVAL_REQUESTED',
        PROJECT_ID,
        expect.objectContaining({
          projectId: PROJECT_ID,
          approvalId: APPROVAL_ID,
        }),
        'module-17',
      )
    })
  })

  // ── STEP 4: Cliente responde APPROVED ──────────────────────────────────────

  describe('Step 4: Client responds APPROVED (POST /portal/approvals/[id]/respond)', () => {
    it('retorna 200 com status APPROVED e registra historico', async () => {
      // Arrange
      currentUser = mockClientUser
      const pendingApproval = {
        ...baseApproval,
        status: 'PENDING',
        clientAccess: { clientEmail: mockClientUser.email },
        requester: { email: mockUser.email, name: mockUser.name },
        project: { id: PROJECT_ID, name: 'Test Project' },
      }
      vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValue(pendingApproval as never)
      vi.mocked(prisma.approvalRequest.update).mockResolvedValue({
        ...pendingApproval,
        status: 'APPROVED',
        respondedAt: new Date(),
      } as never)

      // Act
      const { POST } = await import(
        '@/app/api/portal/approvals/[approvalId]/respond/route'
      )
      const req = createRequest({ action: 'APPROVED' }) as never

      const res = await POST(req, {
        params: Promise.resolve({ approvalId: APPROVAL_ID }),
      })

      // Assert
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe('APPROVED')

      // Step 5: Verify logApprovalHistory called with APPROVED
      expect(logApprovalHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalId: APPROVAL_ID,
          action: 'APPROVED',
          actorId: mockClientUser.id,
        }),
      )
    })
  })

  // ── STEP 6: Segunda resposta na mesma aprovacao -> 409 ─────────────────────

  describe('Step 6: Second response attempt -> 409', () => {
    it('retorna 409 quando aprovacao ja foi respondida', async () => {
      // Arrange
      currentUser = mockClientUser
      const approvedApproval = {
        ...baseApproval,
        status: 'APPROVED',
        respondedAt: new Date(),
        clientAccess: { clientEmail: mockClientUser.email },
        requester: { email: mockUser.email, name: mockUser.name },
        project: { id: PROJECT_ID, name: 'Test Project' },
      }
      vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValue(approvedApproval as never)

      // Act
      const { POST } = await import(
        '@/app/api/portal/approvals/[approvalId]/respond/route'
      )
      const req = createRequest({ action: 'APPROVED' }) as never

      const res = await POST(req, {
        params: Promise.resolve({ approvalId: APPROVAL_ID }),
      })

      // Assert
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.code).toBe('APPROVAL_051')
    })
  })

  // ── STEP 7: Resposta em aprovacao EXPIRED -> 410 ───────────────────────────

  describe('Step 7: Response to EXPIRED approval -> 410', () => {
    it('retorna 410 quando aprovacao esta expirada', async () => {
      // Arrange
      currentUser = mockClientUser
      const expiredApproval = {
        ...baseApproval,
        status: 'EXPIRED',
        clientAccess: { clientEmail: mockClientUser.email },
        requester: { email: mockUser.email, name: mockUser.name },
        project: { id: PROJECT_ID, name: 'Test Project' },
      }
      vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValue(expiredApproval as never)

      // Act
      const { POST } = await import(
        '@/app/api/portal/approvals/[approvalId]/respond/route'
      )
      const req = createRequest({ action: 'APPROVED' }) as never

      const res = await POST(req, {
        params: Promise.resolve({ approvalId: APPROVAL_ID }),
      })

      // Assert
      expect(res.status).toBe(410)
      const data = await res.json()
      expect(data.code).toBe('APPROVAL_EXPIRED')
    })
  })
})
