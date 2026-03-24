import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── MOCK PRISMA ──────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    costConfig: {
      findFirst: vi.fn(),
    },
    projectCostRate: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

const mockConfigFindFirst = vi.mocked(prisma.costConfig.findFirst)
const mockProjectCostRate = vi.mocked(prisma.projectCostRate.findUnique)

// ─── IMPORT ───────────────────────────────────────────────────────────────────

import { CostResolver } from '@/lib/services/cost-resolver'

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000'
const USER_ID = '660e8400-e29b-41d4-a716-446655440001'
const CONFIG_ID = 'cfg-001'
const OVERRIDE_ID = 'ovr-001'

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('CostResolver', () => {
  let resolver: CostResolver

  beforeEach(() => {
    vi.clearAllMocks()
    resolver = new CostResolver(PROJECT_ID)
  })

  describe('resolve', () => {
    it('returns override rate when override exists (source: override)', async () => {
      mockConfigFindFirst.mockResolvedValue({
        id: CONFIG_ID,
        hourlyRate: 100,
        overrides: [{ id: OVERRIDE_ID, customRate: 150 }],
      } as never)

      const result = await resolver.resolve(USER_ID, 'DEV')

      expect(result.rate).toBe(150)
      expect(result.source).toBe('override')
      expect(result.configId).toBe(CONFIG_ID)
      expect(result.overrideId).toBe(OVERRIDE_ID)
    })

    it('returns role-config rate when no override (source: role-config)', async () => {
      mockConfigFindFirst.mockResolvedValue({
        id: CONFIG_ID,
        hourlyRate: 100,
        overrides: [],
      } as never)

      const result = await resolver.resolve(USER_ID, 'DEV')

      expect(result.rate).toBe(100)
      expect(result.source).toBe('role-config')
      expect(result.configId).toBe(CONFIG_ID)
      expect(result.overrideId).toBeUndefined()
    })

    it('returns project-rate when no config (source: project-rate)', async () => {
      mockConfigFindFirst.mockResolvedValue(null as never)
      mockProjectCostRate.mockResolvedValue({
        projectId: PROJECT_ID,
        role: 'DEV',
        hourlyRate: 80,
      } as never)

      const result = await resolver.resolve(USER_ID, 'DEV')

      expect(result.rate).toBe(80)
      expect(result.source).toBe('project-rate')
    })

    it('returns global default when nothing configured (source: global-default)', async () => {
      mockConfigFindFirst.mockResolvedValue(null as never)
      mockProjectCostRate.mockResolvedValue(null as never)

      const result = await resolver.resolve(USER_ID, 'DEV')

      expect(result.rate).toBe(100) // DEFAULT_HOURLY_RATES.DEV
      expect(result.source).toBe('global-default')
    })

    it('returns rate=0 for unknown role', async () => {
      mockConfigFindFirst.mockResolvedValue(null as never)
      mockProjectCostRate.mockResolvedValue(null as never)

      const result = await resolver.resolve(USER_ID, 'UNKNOWN_ROLE')

      expect(result.rate).toBe(0)
      expect(result.source).toBe('global-default')
    })
  })

  describe('resolveForEntry', () => {
    it('returns cost=0 for non-billable entries', async () => {
      mockConfigFindFirst.mockResolvedValue({
        id: CONFIG_ID,
        hourlyRate: 100,
        overrides: [],
      } as never)

      const result = await resolver.resolveForEntry(
        { userId: USER_ID, hours: 4, billable: false },
        'DEV',
      )

      expect(result.cost).toBe(0)
      expect(result.rate).toBe(100)
      expect(result.source).toBe('role-config')
    })

    it('returns correct cost for billable entries', async () => {
      mockConfigFindFirst.mockResolvedValue({
        id: CONFIG_ID,
        hourlyRate: 100,
        overrides: [],
      } as never)

      const result = await resolver.resolveForEntry(
        { userId: USER_ID, hours: 4, billable: true },
        'DEV',
      )

      expect(result.cost).toBe(400) // 4h * 100
      expect(result.rate).toBe(100)
    })
  })
})
