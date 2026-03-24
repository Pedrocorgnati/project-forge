import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do prisma para testes unitários
vi.mock('@/lib/db', () => ({
  prisma: {
    benchmark: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { BenchmarkMatcher } from '@/lib/services/benchmark-matcher'

const mockBenchmark = {
  id: 'bench-1',
  category: 'backend-api',
  subcategory: 'rest-crud',
  avgHours: 30,
  p25: 20,
  p75: 45,
  source: 'internal-2024',
  updatedAt: new Date(),
}

const mockBenchmarkCategoryOnly = {
  ...mockBenchmark,
  id: 'bench-2',
  subcategory: null,
}

const mockFallback = {
  ...mockBenchmark,
  id: 'bench-fallback',
  category: 'backend-api',
  subcategory: null,
}

describe('BenchmarkMatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('findBest should return exact match when category+subcategory matches', async () => {
    vi.mocked(prisma.benchmark.findFirst).mockResolvedValueOnce(mockBenchmark as any)

    const result = await BenchmarkMatcher.findBest('backend-api', 'rest-crud')

    expect(result).toEqual(mockBenchmark)
    expect(prisma.benchmark.findFirst).toHaveBeenCalledWith({
      where: { category: 'backend-api', subcategory: 'rest-crud' },
      orderBy: { updatedAt: 'desc' },
    })
  })

  it('findBest should fallback to category when subcategory not found', async () => {
    // Primeira chamada (exact match) retorna null
    vi.mocked(prisma.benchmark.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockBenchmarkCategoryOnly as any)

    const result = await BenchmarkMatcher.findBest('backend-api', 'graphql')

    expect(result).toEqual(mockBenchmarkCategoryOnly)
    // Deve ter chamado 2 vezes: exact match + category match
    expect(prisma.benchmark.findFirst).toHaveBeenCalledTimes(2)
    expect(prisma.benchmark.findFirst).toHaveBeenNthCalledWith(2, {
      where: { category: 'backend-api' },
      orderBy: { updatedAt: 'desc' },
    })
  })

  it('findBest should fallback to backend-api when category not found', async () => {
    // Sem subcategory, então pula direto para category match (null) e depois fallback
    vi.mocked(prisma.benchmark.findFirst)
      .mockResolvedValueOnce(null)        // category match
      .mockResolvedValueOnce(mockFallback as any)  // fallback backend-api

    const result = await BenchmarkMatcher.findBest('unknown-category')

    expect(result).toEqual(mockFallback)
    expect(prisma.benchmark.findFirst).toHaveBeenLastCalledWith({
      where: { category: 'backend-api' },
    })
  })

  it('findBest should return null only when DB is empty', async () => {
    vi.mocked(prisma.benchmark.findFirst).mockResolvedValue(null)

    const result = await BenchmarkMatcher.findBest('nonexistent-category')

    expect(result).toBeNull()
  })

  it('findByCategory should return array of benchmarks for given category', async () => {
    const benchmarks = [
      { ...mockBenchmark, id: 'b-1', subcategory: 'rest-crud' },
      { ...mockBenchmark, id: 'b-2', subcategory: 'graphql' },
      { ...mockBenchmark, id: 'b-3', subcategory: null },
    ]
    vi.mocked(prisma.benchmark.findMany).mockResolvedValue(benchmarks as any)

    const result = await BenchmarkMatcher.findByCategory('backend-api')

    expect(result).toHaveLength(3)
    expect(prisma.benchmark.findMany).toHaveBeenCalledWith({
      where: { category: 'backend-api' },
      orderBy: [{ subcategory: 'asc' }, { updatedAt: 'desc' }],
    })
  })
})
