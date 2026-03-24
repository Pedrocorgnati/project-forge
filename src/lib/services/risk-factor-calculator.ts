// ─── RISK FACTOR CALCULATOR ───────────────────────────────────────────────────

interface RiskBreakdown {
  techRisk: number       // 0–0.2
  complexityRisk: number // 0–0.2
  dependencyRisk: number // 0–0.1
  total: number          // 1.0–1.5 (capped)
}

const HIGH_TECH_RISK_CATEGORIES = ['ai-ml', 'integration', 'devops']
const MEDIUM_TECH_RISK_CATEGORIES = ['auth-system', 'database-design']

const COMPLEXITY_KEYWORDS = [
  'complexo', 'complex', 'múltiplos', 'multiple', 'avançado', 'advanced',
  'real-time', 'concurrência', 'concurrency',
]
const DEPENDENCY_KEYWORDS = [
  'stripe', 'twilio', 'sendgrid', 'aws', 'google', 'firebase',
  'external', 'terceiro', 'third-party',
]

/**
 * Calcula o multiplicador de risco (1.0–1.5) combinando:
 * - tech risk (categoria da task)
 * - complexity risk (keywords na descrição)
 * - dependency risk (integrações externas)
 * - sugestão da IA (peso 30%)
 */
export class RiskFactorCalculator {
  static async calculate(category: string, aiSuggested: number, description?: string): Promise<number> {
    return this.breakdown(category, aiSuggested, description).total
  }

  static breakdown(category: string, aiSuggested: number, description?: string): RiskBreakdown {
    const desc = (description ?? '').toLowerCase()

    // Tech risk por categoria
    let techRisk = 0
    if (HIGH_TECH_RISK_CATEGORIES.includes(category)) techRisk = 0.2
    else if (MEDIUM_TECH_RISK_CATEGORIES.includes(category)) techRisk = 0.1

    // Complexity risk (keywords)
    const complexityHits = COMPLEXITY_KEYWORDS.filter(k => desc.includes(k)).length
    const complexityRisk = Math.min(0.2, complexityHits * 0.05)

    // Dependency risk (integrações externas)
    const dependencyHits = DEPENDENCY_KEYWORDS.filter(k => desc.includes(k)).length
    const dependencyRisk = Math.min(0.1, dependencyHits * 0.05)

    // Blend: 70% regras + 30% IA
    const rulesBased = 1.0 + techRisk + complexityRisk + dependencyRisk
    const aiClamped = Math.min(1.5, Math.max(1.0, aiSuggested))
    const total = Math.min(1.5, rulesBased * 0.7 + aiClamped * 0.3)

    return {
      techRisk,
      complexityRisk,
      dependencyRisk,
      total: parseFloat(total.toFixed(2)),
    }
  }
}
