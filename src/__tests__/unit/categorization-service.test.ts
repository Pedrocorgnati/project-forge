import { describe, it, expect, vi } from 'vitest'

// Mock prisma (ProjectCategory.findMany)
vi.mock('@/lib/db', () => ({
  prisma: {
    projectCategory: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}))

import { CategorizationService } from '@/lib/services/categorization-service'

describe('CategorizationService', () => {
  it('should return backend-api fallback for unrecognized description', async () => {
    const result = await CategorizationService.categorize('fazer algo genérico')
    expect(result.category).toBe('backend-api')
    expect(result.confidence).toBeLessThan(0.5)
  })

  it('should categorize auth-related items correctly', async () => {
    const result = await CategorizationService.categorize(
      'implementar OAuth2 e RBAC com permissões de usuário',
    )
    expect(result.category).toBe('auth-system')
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('should handle empty description gracefully', async () => {
    const result = await CategorizationService.categorize('')
    expect(result.category).toBe('backend-api')
    expect(result.confidence).toBeLessThan(0.4)
  })

  it('should batch categorize without errors', async () => {
    const results = await CategorizationService.categorizeBatch([
      'criar endpoint de pagamento Stripe',
      'tela de dashboard com gráficos',
      'configurar Docker e CI/CD',
    ])
    expect(results).toHaveLength(3)
    expect(results[0].category).toBe('integration')
    expect(results[1].category).toBe('frontend-page')
    expect(results[2].category).toBe('devops')
  })
})
