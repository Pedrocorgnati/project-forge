import { prisma } from '@/lib/db'
import type { Benchmark } from '@prisma/client'

// ─── BENCHMARK MATCHER ────────────────────────────────────────────────────────

/**
 * Serviço que encontra o benchmark mais relevante para um item de estimativa.
 * Estratégia: exact match (category + subcategory) > category > fallback 'backend-api'
 */
export class BenchmarkMatcher {
  static async findBest(category: string, subcategory?: string): Promise<Benchmark | null> {
    // Tentativa 1: match exato com subcategoria
    if (subcategory) {
      const exact = await prisma.benchmark.findFirst({
        where: { category, subcategory },
        orderBy: { updatedAt: 'desc' },
      })
      if (exact) return exact
    }

    // Tentativa 2: match de categoria (sem subcategoria)
    const catMatch = await prisma.benchmark.findFirst({
      where: { category },
      orderBy: { updatedAt: 'desc' },
    })
    if (catMatch) return catMatch

    // Tentativa 3: fallback genérico 'backend-api'
    return prisma.benchmark.findFirst({
      where: { category: 'backend-api' },
    })
  }

  static async findByCategory(category: string): Promise<Benchmark[]> {
    return prisma.benchmark.findMany({
      where: { category },
      orderBy: [{ subcategory: 'asc' }, { updatedAt: 'desc' }],
    })
  }
}
