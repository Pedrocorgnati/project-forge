import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do prisma para testes unitários
vi.mock('@/lib/db', () => ({
  prisma: {
    briefQuestion: {
      findMany: vi.fn(),
    },
    benchmark: {
      findFirst: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { ConfidenceCalculator } from '@/lib/services/confidence-calculator'

const mockItemsGood = [
  { category: 'backend-api', hoursMin: 30, hoursMax: 50, riskFactor: 1.1 },
  { category: 'auth-system', hoursMin: 20, hoursMax: 30, riskFactor: 1.0 },
  { category: 'frontend-component', hoursMin: 10, hoursMax: 14, riskFactor: 1.0 },
  { category: 'testing', hoursMin: 8, hoursMax: 12, riskFactor: 1.0 },
]

const mockQuestions90pct = Array.from({ length: 10 }, (_, i) => ({
  id: `q-${i}`,
  answerText: i < 9 ? 'Resposta detalhada do cliente aqui' : null,
  questionText: `Pergunta ${i + 1}`,
}))

const mockQuestions50pct = Array.from({ length: 10 }, (_, i) => ({
  id: `q-${i}`,
  answerText: i < 5 ? 'Resposta detalhada aqui' : null,
  questionText: `Pergunta ${i + 1}`,
}))

describe('ConfidenceCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock BenchmarkMatcher.findBest via benchmark.findFirst
    vi.mocked(prisma.benchmark.findFirst).mockResolvedValue({
      id: 'bench-1',
      category: 'backend-api',
      subcategory: null,
      avgHours: 30,
      p25: 20,
      p75: 45,
      source: 'internal-2024',
      updatedAt: new Date(),
    } as any)
  })

  it('should return HIGH for fully answered brief with good benchmark coverage', async () => {
    vi.mocked(prisma.briefQuestion.findMany).mockResolvedValue(mockQuestions90pct as any)
    const result = await ConfidenceCalculator.calculate('brief-90pct', mockItemsGood)
    expect(result).toBe('HIGH')
  })

  it('should return MEDIUM for partially answered brief (50%)', async () => {
    vi.mocked(prisma.briefQuestion.findMany).mockResolvedValue(mockQuestions50pct as any)
    const result = await ConfidenceCalculator.calculate('brief-50pct', mockItemsGood)
    expect(result).toBe('MEDIUM')
  })

  it('should return LOW for empty brief', async () => {
    vi.mocked(prisma.briefQuestion.findMany).mockResolvedValue([])
    const result = await ConfidenceCalculator.calculate('brief-empty', mockItemsGood)
    expect(result).toBe('LOW')
  })

  it('should return LOW when no items provided', async () => {
    vi.mocked(prisma.briefQuestion.findMany).mockResolvedValue(mockQuestions90pct as any)
    const result = await ConfidenceCalculator.calculate('brief-90pct', [])
    expect(result).toBe('LOW')
  })

  it('should return MEDIUM for good brief with wide ranges (low tightness)', async () => {
    vi.mocked(prisma.briefQuestion.findMany).mockResolvedValue(mockQuestions90pct as any)
    const looseItems = [
      { category: 'backend-api', hoursMin: 5, hoursMax: 100, riskFactor: 1.0 },
      { category: 'ai-ml', hoursMin: 10, hoursMax: 200, riskFactor: 1.5 },
    ]
    const result = await ConfidenceCalculator.calculate('brief-90pct', looseItems)
    expect(['MEDIUM', 'LOW']).toContain(result)
  })
})
