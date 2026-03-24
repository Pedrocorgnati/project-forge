import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do prisma para testes unitários
vi.mock('@/lib/db', () => ({
  prisma: {
    brief: {
      findUnique: vi.fn(),
    },
    estimate: {
      update: vi.fn(),
      findUnique: vi.fn(),
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

vi.mock('@/lib/events/bus', () => ({
  EventBus: {
    publish: vi.fn(),
  },
}))

vi.mock('@/lib/services/benchmark-matcher', () => ({
  BenchmarkMatcher: {
    findBest: vi.fn(),
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
import { EventBus } from '@/lib/events/bus'
import { EventType } from '@/lib/constants/events'
import { EstimationEngine } from '@/lib/services/estimation-engine'
import { BenchmarkMatcher } from '@/lib/services/benchmark-matcher'

const mockBrief = {
  id: 'brief-1',
  projectId: 'proj-1',
  sessions: [
    {
      status: 'COMPLETED',
      questions: [
        { questionText: 'O que é o projeto?', answerText: 'Um SaaS de gestão', order: 1 },
        { questionText: 'Qual o público?', answerText: 'PMEs brasileiras', order: 2 },
      ],
    },
  ],
}

const mockEstimate = {
  id: 'est-1',
  projectId: 'proj-1',
  version: 1,
  status: 'READY',
  totalMin: 112,
  totalMax: 176,
}

describe('EstimationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any)
    vi.mocked(prisma.estimate.findUnique).mockResolvedValue(mockEstimate as any)
    vi.mocked(prisma.estimate.update).mockResolvedValue(mockEstimate as any)
    vi.mocked(BenchmarkMatcher.findBest).mockResolvedValue({
      id: 'bench-1',
      category: 'backend-api',
      subcategory: null,
      avgHours: 30,
      p25: 20,
      p75: 45,
      source: 'internal-2024',
      updatedAt: new Date(),
    } as any)

    // Mock $transaction para executar a callback diretamente
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      return fn({
        estimateItem: { createMany: vi.fn() },
        estimate: { update: vi.fn().mockResolvedValue({ ...mockEstimate, version: 1 }) },
        estimateVersion: { create: vi.fn() },
      })
    })
  })

  it('should generate estimate successfully with mock AI (NODE_ENV=test)', async () => {
    await expect(
      EstimationEngine.generate('est-1', 'brief-1', 'user-1'),
    ).resolves.not.toThrow()
  })

  it('should mark as ARCHIVED when AI returns invalid JSON (parse error)', async () => {
    // Forçar callAI a retornar JSON inválido sobrescrevendo mockAIResponse
    const originalEnv = process.env.NODE_ENV
    vi.spyOn(EstimationEngine as any, 'callAI').mockResolvedValueOnce('not valid json {{{')

    await expect(
      EstimationEngine.generate('est-1', 'brief-1', 'user-1'),
    ).rejects.toThrow()

    expect(prisma.estimate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'est-1' },
        data: expect.objectContaining({
          status: 'ARCHIVED',
          aiRawResponse: expect.stringContaining('PARSE_ERROR'),
        }),
      }),
    )

    ;(process.env as Record<string, string | undefined>).NODE_ENV = originalEnv
  })

  it('should mark as ARCHIVED when totalCostMin < MARKET_MINIMUM_BRL (ESTIMATE_050)', async () => {
    // Mock AI retorna itens com horas muito baixas (custo total < 5000)
    vi.spyOn(EstimationEngine as any, 'callAI').mockResolvedValueOnce(
      JSON.stringify({
        items: [
          { category: 'backend-api', description: 'API simples', hoursMin: 1, hoursMax: 2, riskFactor: 1.0 },
          { category: 'frontend-component', description: 'Botão', hoursMin: 1, hoursMax: 2, riskFactor: 1.0 },
          { category: 'testing', description: 'Testes', hoursMin: 1, hoursMax: 2, riskFactor: 1.0 },
          { category: 'devops', description: 'Deploy', hoursMin: 1, hoursMax: 2, riskFactor: 1.0 },
          { category: 'database-design', description: 'Schema', hoursMin: 1, hoursMax: 2, riskFactor: 1.0 },
        ],
      }),
    )

    await expect(
      EstimationEngine.generate('est-1', 'brief-1', 'user-1'),
    ).rejects.toThrow('ESTIMATE_050')

    expect(prisma.estimate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ARCHIVED',
          aiRawResponse: expect.stringContaining('ESTIMATE_050'),
        }),
      }),
    )
  })

  it('should throw when brief not found', async () => {
    vi.mocked(prisma.brief.findUnique).mockResolvedValue(null)

    await expect(
      EstimationEngine.generate('est-1', 'brief-404', 'user-1'),
    ).rejects.toThrow('não encontrado')
  })

  it('should call BenchmarkMatcher.findBest for each item', async () => {
    await EstimationEngine.generate('est-1', 'brief-1', 'user-1')

    // A mock AI retorna 7 items
    expect(BenchmarkMatcher.findBest).toHaveBeenCalledTimes(7)
    expect(BenchmarkMatcher.findBest).toHaveBeenCalledWith('auth-system')
    expect(BenchmarkMatcher.findBest).toHaveBeenCalledWith('backend-api')
    expect(BenchmarkMatcher.findBest).toHaveBeenCalledWith('testing')
  })

  it('should publish ESTIMATE_CREATED event on success', async () => {
    await EstimationEngine.generate('est-1', 'brief-1', 'user-1')

    expect(EventBus.publish).toHaveBeenCalledWith(
      EventType.ESTIMATE_CREATED,
      'proj-1',
      expect.objectContaining({
        estimateId: 'est-1',
        projectId: 'proj-1',
      }),
    )
  })
})
