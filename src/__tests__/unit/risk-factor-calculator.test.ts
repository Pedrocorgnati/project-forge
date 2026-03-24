import { describe, it, expect } from 'vitest'
import { RiskFactorCalculator } from '@/lib/services/risk-factor-calculator'

describe('RiskFactorCalculator', () => {
  it('should return 1.0 for simple low-risk frontend item', async () => {
    const result = await RiskFactorCalculator.calculate('frontend-component', 1.0, 'botão simples')
    expect(result).toBe(1.0)
  })

  it('should cap risk at 1.5', async () => {
    const result = await RiskFactorCalculator.calculate(
      'ai-ml',
      1.5,
      'complex advanced multiple external aws',
    )
    expect(result).toBeLessThanOrEqual(1.5)
  })

  it('should return risk >= 1.0 always', async () => {
    const result = await RiskFactorCalculator.calculate('frontend-component', 1.0)
    expect(result).toBeGreaterThanOrEqual(1.0)
  })

  it('should increase risk for ai-ml category with complex description', async () => {
    const result = await RiskFactorCalculator.calculate(
      'ai-ml',
      1.3,
      'integração com LLM externo avançado',
    )
    expect(result).toBeGreaterThanOrEqual(1.4)
  })

  it('should increase risk for external dependencies', async () => {
    const withDep = await RiskFactorCalculator.calculate('integration', 1.0, 'integração stripe')
    const withoutDep = await RiskFactorCalculator.calculate('backend-api', 1.0, 'crud simples')
    expect(withDep).toBeGreaterThan(withoutDep)
  })

  it('should return breakdown with all required fields', () => {
    const breakdown = RiskFactorCalculator.breakdown('ai-ml', 1.2, 'sistema LLM avançado')
    expect(breakdown).toHaveProperty('techRisk')
    expect(breakdown).toHaveProperty('complexityRisk')
    expect(breakdown).toHaveProperty('dependencyRisk')
    expect(breakdown).toHaveProperty('total')
    expect(breakdown.total).toBeGreaterThanOrEqual(1.0)
    expect(breakdown.total).toBeLessThanOrEqual(1.5)
  })
})
