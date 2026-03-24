import { vi, describe, it, expect, beforeEach } from 'vitest'
import { UserRole } from '@prisma/client'

// ─── MOCK NEXT CACHE ──────────────────────────────────────────────────────────

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ─── MOCK AUTH ────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/get-user', () => ({
  requireServerUser: vi.fn(),
}))

import { requireServerUser } from '@/lib/auth/get-user'

const mockGetAuthUser = vi.mocked(requireServerUser)

// ─── MOCK RBAC ────────────────────────────────────────────────────────────────

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: vi.fn().mockResolvedValue({ projectRole: UserRole.SOCIO }),
  hasRole: vi.fn(),
}))

import { hasRole } from '@/lib/rbac'

const mockHasRole = vi.mocked(hasRole)

// ─── MOCK EVENT BUS ───────────────────────────────────────────────────────────

vi.mock('@/lib/events', () => ({
  EventBus: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
}))

import { EventBus } from '@/lib/events'

const mockPublish = vi.mocked(EventBus.publish)

// ─── MOCK COST RESOLVER ──────────────────────────────────────────────────────

vi.mock('@/lib/services/cost-resolver', () => ({
  CostResolver: class MockCostResolver {
    resolve = vi.fn().mockResolvedValue({ rate: 100, source: 'role-config', configId: 'cfg-1' })
  },
}))

// ─── MOCK PRISMA ──────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    costConfig: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    costOverride: {
      upsert: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

const mockConfigCreate = vi.mocked(prisma.costConfig.create)
const mockConfigUpdateMany = vi.mocked(prisma.costConfig.updateMany)
const mockConfigFindFirst = vi.mocked(prisma.costConfig.findFirst)
const mockConfigFindUnique = vi.mocked(prisma.costConfig.findUnique)
const mockConfigUpdate = vi.mocked(prisma.costConfig.update)
const mockOverrideUpsert = vi.mocked(prisma.costOverride.upsert)
const mockMemberFindUnique = vi.mocked(prisma.projectMember.findUnique)
const mockMemberFindMany = vi.mocked(prisma.projectMember.findMany)
const mockUserFindUnique = vi.mocked(prisma.user.findUnique)

// ─── IMPORT ACTIONS ───────────────────────────────────────────────────────────

import {
  createCostConfig,
  createCostOverride,
  updateCostConfig,
  getEffectiveRates,
} from '@/actions/cost-config'

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000'
const USER_ID = '660e8400-e29b-41d4-a716-446655440001'
const TARGET_USER_ID = '770e8400-e29b-41d4-a716-446655440002'
const CONFIG_ID = 'cfg-001'

const fakeSocio = {
  id: USER_ID,
  name: 'Socio User',
  email: 'socio@test.com',
  role: UserRole.SOCIO,
  organizationId: 'org-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  avatarUrl: null,
}

const fakeConfig = {
  id: CONFIG_ID,
  projectId: PROJECT_ID,
  createdById: USER_ID,
  role: UserRole.DEV,
  hourlyRate: 100,
  effectiveFrom: new Date('2026-01-01'),
  effectiveTo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('createCostConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeSocio as never)
    mockConfigUpdateMany.mockResolvedValue({ count: 0 } as never)
    mockConfigCreate.mockResolvedValue(fakeConfig as never)
  })

  it('creates config successfully as SOCIO', async () => {
    const result = await createCostConfig({
      projectId: PROJECT_ID,
      role: UserRole.DEV,
      hourlyRate: 120,
      effectiveFrom: '2026-03-20',
    })

    expect(result).toHaveProperty('data')
    expect(mockConfigCreate).toHaveBeenCalledTimes(1)
  })

  it('closes previous config for the same role', async () => {
    await createCostConfig({
      projectId: PROJECT_ID,
      role: UserRole.DEV,
      hourlyRate: 120,
      effectiveFrom: '2026-03-20',
    })

    expect(mockConfigUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: PROJECT_ID,
          role: UserRole.DEV,
          effectiveTo: null,
        }),
      }),
    )
  })

  it('publishes COST_CONFIG_UPDATED event', async () => {
    await createCostConfig({
      projectId: PROJECT_ID,
      role: UserRole.DEV,
      hourlyRate: 120,
      effectiveFrom: '2026-03-20',
    })

    expect(mockPublish).toHaveBeenCalledWith(
      'COST_CONFIG_UPDATED',
      PROJECT_ID,
      expect.objectContaining({
        updatedBy: USER_ID,
        role: UserRole.DEV,
        newRate: 120,
      }),
      'module-14-rentabilia',
    )
  })
})

describe('createCostOverride', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeSocio as never)
    mockMemberFindUnique.mockResolvedValue({ projectId: PROJECT_ID, userId: TARGET_USER_ID } as never)
    mockUserFindUnique.mockResolvedValue({ role: UserRole.DEV } as never)
    mockConfigFindFirst.mockResolvedValue(fakeConfig as never)
    mockOverrideUpsert.mockResolvedValue({
      id: 'ovr-001',
      costConfigId: CONFIG_ID,
      userId: TARGET_USER_ID,
      customRate: 130,
      reason: 'Senior rate override',
    } as never)
  })

  it('creates override for a project member', async () => {
    const result = await createCostOverride({
      projectId: PROJECT_ID,
      userId: TARGET_USER_ID,
      customRate: 130,
      reason: 'Senior rate override',
    })

    expect(result).toHaveProperty('data')
    expect(mockOverrideUpsert).toHaveBeenCalledTimes(1)
  })

  it('throws TS_061 for non-member user', async () => {
    mockMemberFindUnique.mockResolvedValue(null as never)

    const result = await createCostOverride({
      projectId: PROJECT_ID,
      userId: TARGET_USER_ID,
      customRate: 130,
      reason: 'Senior rate override',
    })

    expect(result).toHaveProperty('error')
    expect((result as { code?: string }).code).toBe('TS_061')
  })

  it('publishes COST_CONFIG_UPDATED event after upsert', async () => {
    await createCostOverride({
      projectId: PROJECT_ID,
      userId: TARGET_USER_ID,
      customRate: 130,
      reason: 'Senior rate override',
    })

    expect(mockPublish).toHaveBeenCalledWith(
      'COST_CONFIG_UPDATED',
      PROJECT_ID,
      expect.objectContaining({
        updatedBy: USER_ID,
        newRate: 130,
      }),
      'module-14-rentabilia',
    )
  })
})

describe('updateCostConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeSocio as never)
    mockConfigFindUnique.mockResolvedValue(fakeConfig as never)
    mockConfigUpdate.mockResolvedValue({ ...fakeConfig, hourlyRate: 150 } as never)
  })

  it('updates hourlyRate successfully', async () => {
    const result = await updateCostConfig(CONFIG_ID, { hourlyRate: 150 })

    expect(result).toHaveProperty('data')
    expect(mockConfigUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CONFIG_ID },
        data: expect.objectContaining({ hourlyRate: 150 }),
      }),
    )
  })

  it('returns error when config not found', async () => {
    mockConfigFindUnique.mockResolvedValue(null as never)

    const result = await updateCostConfig('nonexistent', { hourlyRate: 150 })

    expect(result).toHaveProperty('error')
    expect((result as { code?: string }).code).toBe('TS_081')
  })

  it('requires at least one field', async () => {
    const result = await updateCostConfig(CONFIG_ID, {})

    expect(result).toHaveProperty('error')
    expect((result as { code?: string }).code).toBe('VAL_002')
  })
})

describe('getEffectiveRates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeSocio as never)
    mockHasRole.mockReturnValue(true)
    mockMemberFindMany.mockResolvedValue([
      {
        userId: TARGET_USER_ID,
        user: { id: TARGET_USER_ID, name: 'Dev User', role: UserRole.DEV },
      },
    ] as never)
  })

  it('returns rates with correct source', async () => {
    const result = await getEffectiveRates(PROJECT_ID)

    expect(result).toHaveProperty('data')
    const data = (result as { data: Array<{ rateSource: string }> }).data
    expect(data).toHaveLength(1)
    expect(data[0].rateSource).toBe('role-config')
  })
})
