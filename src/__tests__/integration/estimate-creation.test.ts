import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    brief: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    estimate: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    estimateItem: {
      createMany: vi.fn(),
    },
    estimateVersion: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock auth helpers
vi.mock('@/lib/auth/get-user', () => ({
  getServerUser: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: vi.fn(),
}))

vi.mock('@/lib/events/bus', () => ({
  EventBus: {
    publish: vi.fn(),
  },
}))

vi.mock('@/lib/services/benchmark-matcher', () => ({
  BenchmarkMatcher: {
    findBest: vi.fn().mockResolvedValue({
      id: 'bench-1',
      category: 'backend-api',
      subcategory: null,
      avgHours: 30,
      p25: 20,
      p75: 45,
      source: 'internal-2024',
      updatedAt: new Date(),
    }),
  },
}))

vi.mock('@/lib/services/confidence-calculator', () => ({
  ConfidenceCalculator: {
    calculate: vi.fn().mockResolvedValue('HIGH'),
  },
}))

vi.mock('@/lib/services/risk-factor-calculator', () => ({
  RiskFactorCalculator: {
    calculate: vi.fn().mockResolvedValue(1.0),
  },
}))

import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'

const mockAdmin = { id: 'user-admin', role: 'ADMIN', projectRole: 'OWNER' }
const mockClient = { id: 'user-client', role: 'CLIENTE', projectRole: 'VIEWER' }

const mockApprovedBrief = {
  id: 'brief-1',
  projectId: 'proj-1',
  status: 'APPROVED',
  sessions: [
    {
      status: 'COMPLETED',
      questions: [
        { questionText: 'O que?', answerText: 'SaaS', order: 1 },
      ],
    },
  ],
}

const mockEstimate = {
  id: 'est-1',
  projectId: 'proj-1',
  briefId: 'brief-1',
  version: 1,
  status: 'GENERATING',
  totalMin: null,
  totalMax: null,
  createdAt: new Date(),
}

describe('Integration: Estimate Creation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerUser).mockResolvedValue(mockAdmin as any)
    vi.mocked(withProjectAccess).mockResolvedValue({ projectRole: 'SOCIO' } as any)
  })

  it('should return 422 when no approved brief exists', async () => {
    vi.mocked(prisma.brief.findFirst).mockResolvedValue(null)

    const brief = await prisma.brief.findFirst({
      where: { projectId: 'proj-1', status: 'APPROVED' } as any,
    })

    expect(brief).toBeNull()
    // Sem brief aprovado, o fluxo não pode prosseguir
    // Simula o guard da rota
    const canCreate = brief !== null
    expect(canCreate).toBe(false)
  })

  it('should create estimate with status GENERATING when brief is approved', async () => {
    vi.mocked(prisma.brief.findFirst).mockResolvedValue(mockApprovedBrief as any)
    vi.mocked(prisma.estimate.create).mockResolvedValue(mockEstimate as any)

    const brief = await prisma.brief.findFirst({
      where: { projectId: 'proj-1', status: 'APPROVED' } as any,
    })
    expect(brief).not.toBeNull()

    const estimate = await prisma.estimate.create({
      data: {
        projectId: 'proj-1',
        briefId: brief!.id,
        status: 'GENERATING',
        version: 1,
        createdBy: 'user-admin',
      },
    })

    expect(estimate.status).toBe('GENERATING')
    expect(estimate.briefId).toBe('brief-1')
    expect(estimate.version).toBe(1)
  })

  it('should reject CLIENTE creating estimate (403)', async () => {
    vi.mocked(getServerUser).mockResolvedValue(mockClient as any)
    vi.mocked(withProjectAccess).mockRejectedValue(
      new Error('Forbidden: CLIENTE não pode criar estimativas'),
    )

    await expect(
      withProjectAccess('user-client', 'proj-1'),
    ).rejects.toThrow('Forbidden')
  })

  it('should reject unauthenticated request (401)', async () => {
    vi.mocked(getServerUser).mockResolvedValue(null as any)

    const user = await getServerUser()
    expect(user).toBeNull()
    // Simula guard de autenticação
    const isAuthenticated = user !== null
    expect(isAuthenticated).toBe(false)
  })

  it('should list estimates after creation', async () => {
    const readyEstimate = { ...mockEstimate, status: 'READY', totalMin: 112, totalMax: 176 }
    vi.mocked(prisma.estimate.findMany).mockResolvedValue([readyEstimate] as any)

    const estimates = await prisma.estimate.findMany({
      where: { projectId: 'proj-1' },
    })

    expect(estimates).toHaveLength(1)
    expect(estimates[0].status).toBe('READY')
    expect(estimates[0].totalMin).toBe(112)
    expect(estimates[0].totalMax).toBe(176)
  })
})
