import { prisma } from '@/lib/db'
import { ConfidenceLevel } from '@prisma/client'
import { BenchmarkMatcher } from './benchmark-matcher'

// ─── CONFIDENCE CALCULATOR ────────────────────────────────────────────────────

interface EnrichedItem {
  category: string
  hoursMin: number
  hoursMax: number
  riskFactor: number
}

/**
 * Calcula o nível de confiança de uma estimativa.
 *
 * Scoring:
 * - Brief completeness: 0–50 pts (% perguntas respondidas × 50)
 * - Benchmark coverage: 0–30 pts (% itens com benchmark encontrado × 30)
 * - Range tightness:    0–20 pts (1 - avg_range/avg_max × 20)
 *
 * Total ≥ 70 → HIGH | 40–69 → MEDIUM | < 40 → LOW
 */
export class ConfidenceCalculator {
  static async calculate(briefId: string, items: EnrichedItem[]): Promise<ConfidenceLevel> {
    // 1. Brief completeness
    const questions = await prisma.briefQuestion.findMany({
      where: { session: { brief: { id: briefId } } },
    })
    const answered = questions.filter((q: { answerText?: string | null }) => q.answerText && q.answerText.trim().length > 5).length
    const completeness = questions.length > 0 ? answered / questions.length : 0
    const completenessScore = completeness * 50

    // 2. Benchmark coverage
    let benchmarkHits = 0
    for (const item of items) {
      const b = await BenchmarkMatcher.findBest(item.category)
      if (b && b.category === item.category) benchmarkHits++
    }
    const coverageScore = items.length > 0 ? (benchmarkHits / items.length) * 30 : 0

    // 3. Range tightness
    const avgMax = items.reduce((s, i) => s + i.hoursMax, 0) / (items.length || 1)
    const avgRange = items.reduce((s, i) => s + (i.hoursMax - i.hoursMin), 0) / (items.length || 1)
    const tightness = avgMax > 0 ? 1 - avgRange / avgMax : 0
    const tightnessScore = Math.max(0, tightness * 20)

    const total = completenessScore + coverageScore + tightnessScore

    if (total >= 70) return ConfidenceLevel.HIGH
    if (total >= 40) return ConfidenceLevel.MEDIUM
    return ConfidenceLevel.LOW
  }
}
