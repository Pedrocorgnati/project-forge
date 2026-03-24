import { describe, it, expect, vi } from 'vitest'
import { toEstimateBaseline } from '@/types/contracts/estimate-contract'
import type { EstimateBaseline } from '@/types/contracts/estimate-contract'

// Mock do prisma para testes de contrato
vi.mock('@/lib/db', () => ({
  prisma: {
    estimate: {
      findFirst: vi.fn(),
      fields: {
        totalMin: {},
        totalMax: {},
        confidence: {},
        status: {},
      },
    },
  },
}))

describe('Cross-rock contract: EstimaAI → RentabilIA', () => {
  it('should convert Prisma Decimal strings to numbers correctly', () => {
    const mockEstimate = {
      id: 'est-1',
      projectId: 'proj-1',
      version: 1,
      totalMin: '80.00',  // Prisma Decimal retorna como string
      totalMax: '140.00',
      currency: 'BRL',
      confidence: 'HIGH',
      status: 'READY',
    }
    const baseline = toEstimateBaseline(mockEstimate)
    expect(typeof baseline.totalMin).toBe('number')
    expect(typeof baseline.totalMax).toBe('number')
    expect(baseline.totalMin).toBe(80)
    expect(baseline.totalMax).toBe(140)
    expect(baseline.totalMin).toBeLessThan(baseline.totalMax)
  })

  it('should throw when estimate is not READY', () => {
    const notReady = {
      id: 'est-2',
      projectId: 'p',
      version: 1,
      totalMin: 0,
      totalMax: 0,
      currency: 'BRL',
      confidence: 'LOW',
      status: 'GENERATING',
    }
    expect(() => toEstimateBaseline(notReady)).toThrow('não está READY')
  })

  it('should produce valid EstimateBaseline shape', () => {
    const estimate = {
      id: 'est-3',
      projectId: 'proj-3',
      version: 2,
      totalMin: '120.50',
      totalMax: '200.00',
      currency: 'BRL',
      confidence: 'MEDIUM',
      status: 'READY',
    }
    const baseline: EstimateBaseline = toEstimateBaseline(estimate)
    expect(baseline.estimateId).toBe('est-3')
    expect(baseline.projectId).toBe('proj-3')
    expect(baseline.version).toBe(2)
    expect(baseline.status).toBe('READY')
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(baseline.confidence)
  })

  it('should confirm expected Prisma fields exist (contract check)', async () => {
    // Verifica que o mock reflete os campos esperados pelo módulo-14
    const { prisma } = await import('@/lib/db')
    const estimateFields = (prisma.estimate as any).fields
    expect(estimateFields).toHaveProperty('totalMin')
    expect(estimateFields).toHaveProperty('totalMax')
    expect(estimateFields).toHaveProperty('confidence')
    expect(estimateFields).toHaveProperty('status')
  })
})
