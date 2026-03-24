import { vi, describe, it, expect, beforeEach } from 'vitest'
import { UserRole } from '@prisma/client'

// RESOLVED: G002/G003 — Testes de contrato para Server Actions de rentabilia
// Cobre os mesmos cenários BDD que GET/POST/PATCH/DELETE /api/timesheet cobririam

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
  requireFinancialAccess: vi.fn(),
  hasRole: vi.fn(),
}))

import { hasRole } from '@/lib/rbac'

const mockHasRole = vi.mocked(hasRole)

// ─── MOCK PRISMA ──────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    timesheetEntry: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

const mockEntryCreate = vi.mocked(prisma.timesheetEntry.create)
const mockEntryFindUnique = vi.mocked(prisma.timesheetEntry.findUnique)
const mockEntryFindMany = vi.mocked(prisma.timesheetEntry.findMany)
const mockEntryUpdate = vi.mocked(prisma.timesheetEntry.update)
const mockEntryCount = vi.mocked(prisma.timesheetEntry.count)
const mockTaskFindFirst = vi.mocked(prisma.task.findFirst)

// ─── IMPORT ACTIONS ───────────────────────────────────────────────────────────

import {
  logTime,
  editTimeEntry,
  deleteTimeEntry,
  getTimeEntries,
  getTimesheetSummary,
} from '@/actions/rentabilia'

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000'
const USER_ID = '660e8400-e29b-41d4-a716-446655440001'
const OTHER_USER_ID = '770e8400-e29b-41d4-a716-446655440002'
const ENTRY_ID = 'ent-001'

const fakeUser = {
  id: USER_ID,
  name: 'Test User',
  email: 'test@test.com',
  role: UserRole.DEV,
  organizationId: 'org-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  avatarUrl: null,
}

const fakeEntry = {
  id: ENTRY_ID,
  projectId: PROJECT_ID,
  userId: USER_ID,
  taskId: null,
  hours: 4,
  role: UserRole.DEV,
  workDate: new Date('2026-03-20'),
  description: 'Coding',
  notes: null,
  billable: true,
  deletedAt: null,
  createdAt: new Date(), // recent — within 7 day window
  updatedAt: new Date(),
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('logTime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeUser as never)
    mockEntryCreate.mockResolvedValue({ ...fakeEntry, user: { id: USER_ID, name: 'Test', role: UserRole.DEV }, task: null } as never)
  })

  it('[SUCCESS] returns data for a valid entry', async () => {
    const result = await logTime({
      projectId: PROJECT_ID,
      hours: 2,
      role: UserRole.DEV,
      workDate: '2026-03-20',
      billable: true,
    })

    expect(result).toHaveProperty('data')
    expect(mockEntryCreate).toHaveBeenCalledTimes(1)
  })

  it('[ERROR] throws TS_051 for a future date', async () => {
    const result = await logTime({
      projectId: PROJECT_ID,
      hours: 2,
      role: UserRole.DEV,
      workDate: '2099-01-01',
      billable: true,
    })

    expect(result).toHaveProperty('error')
    expect((result as { code?: string }).code).toBe('TS_051')
  })

  it('[ERROR] throws error for hours > 24', async () => {
    const result = await logTime({
      projectId: PROJECT_ID,
      hours: 25,
      role: UserRole.DEV,
      workDate: '2026-03-20',
      billable: true,
    })

    // Zod validation catches hours > 24
    expect(result).toHaveProperty('error')
  })

  it('[EDGE] throws TS_055 for hours not multiple of 0.25', async () => {
    const result = await logTime({
      projectId: PROJECT_ID,
      hours: 1.3,
      role: UserRole.DEV,
      workDate: '2026-03-20',
      billable: true,
    })

    expect(result).toHaveProperty('error')
  })

  it('[EDGE] throws error when taskId belongs to wrong project', async () => {
    mockTaskFindFirst.mockResolvedValue(null)

    const result = await logTime({
      projectId: PROJECT_ID,
      taskId: '880e8400-e29b-41d4-a716-446655440003',
      hours: 2,
      role: UserRole.DEV,
      workDate: '2026-03-20',
      billable: true,
    })

    expect(result).toHaveProperty('error')
    expect((result as { code?: string }).code).toBe('TS_080')
  })
})

describe('editTimeEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeUser as never)
    mockEntryFindUnique.mockResolvedValue(fakeEntry as never)
    mockEntryUpdate.mockResolvedValue({ ...fakeEntry, hours: 6, user: { id: USER_ID, name: 'Test', role: UserRole.DEV }, task: null } as never)
  })

  it('[SUCCESS] allows owner to edit within 7 day window', async () => {
    const result = await editTimeEntry(ENTRY_ID, { hours: 6 })

    expect(result).toHaveProperty('data')
    expect(mockEntryUpdate).toHaveBeenCalledTimes(1)
  })

  it('[ERROR] blocks edit after 7 day window (TS_053)', async () => {
    const oldEntry = {
      ...fakeEntry,
      createdAt: new Date('2026-01-01'), // well past 7 days
    }
    mockEntryFindUnique.mockResolvedValue(oldEntry as never)

    const result = await editTimeEntry(ENTRY_ID, { hours: 6 })

    expect(result).toHaveProperty('error')
    expect((result as { code?: string }).code).toBe('TS_053')
  })

  it('[ERROR] returns 403 (TS_054) for non-owner', async () => {
    const otherUser = { ...fakeUser, id: OTHER_USER_ID }
    mockGetAuthUser.mockResolvedValue(otherUser as never)

    const result = await editTimeEntry(ENTRY_ID, { hours: 6 })

    expect(result).toHaveProperty('error')
    expect((result as { code?: string }).code).toBe('TS_054')
  })

  it('[EDGE] requires at least one field', async () => {
    const result = await editTimeEntry(ENTRY_ID, {})

    expect(result).toHaveProperty('error')
  })
})

describe('deleteTimeEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeUser as never)
    mockEntryFindUnique.mockResolvedValue(fakeEntry as never)
    mockEntryUpdate.mockResolvedValue({ ...fakeEntry, deletedAt: new Date() } as never)
  })

  it('[SUCCESS] allows owner to delete within 7 day window', async () => {
    const result = await deleteTimeEntry(ENTRY_ID)

    expect(result).toHaveProperty('success', true)
    expect(mockEntryUpdate).toHaveBeenCalledTimes(1)
  })

  it('[ERROR] blocks delete after 7 day window', async () => {
    const oldEntry = {
      ...fakeEntry,
      createdAt: new Date('2026-01-01'),
    }
    mockEntryFindUnique.mockResolvedValue(oldEntry as never)

    const result = await deleteTimeEntry(ENTRY_ID)

    expect(result).toHaveProperty('error')
    expect((result as { code?: string }).code).toBe('TS_053')
  })

  it('[ERROR] returns 403 (TS_054) for non-owner', async () => {
    const otherUser = { ...fakeUser, id: OTHER_USER_ID }
    mockGetAuthUser.mockResolvedValue(otherUser as never)

    const result = await deleteTimeEntry(ENTRY_ID)

    expect(result).toHaveProperty('error')
    expect((result as { code?: string }).code).toBe('TS_054')
  })
})

describe('getTimeEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue({ ...fakeUser, role: UserRole.SOCIO } as never)
    mockHasRole.mockReturnValue(true)
    mockEntryFindMany.mockResolvedValue([] as never)
    mockEntryCount.mockResolvedValue(0 as never)
  })

  it('[SUCCESS] SOCIO sees all entries', async () => {
    const result = await getTimeEntries({ projectId: PROJECT_ID })

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('total', 0)
  })

  it('[EDGE] DEV sees only own entries', async () => {
    mockGetAuthUser.mockResolvedValue(fakeUser as never)
    mockHasRole.mockReturnValue(false)

    await getTimeEntries({ projectId: PROJECT_ID })

    // Prisma where should include userId filter
    expect(mockEntryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER_ID,
        }),
      }),
    )
  })

  it('[EDGE] week filter works', async () => {
    await getTimeEntries({ projectId: PROJECT_ID, week: '2026-W12' })

    expect(mockEntryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workDate: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    )
  })
})

describe('getTimesheetSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue({ ...fakeUser, role: UserRole.SOCIO } as never)
    mockHasRole.mockReturnValue(true)
    mockEntryFindMany.mockResolvedValue([
      { hours: 4, billable: true },
      { hours: 2, billable: false },
    ] as never)
  })

  it('[SUCCESS] returns correct totals', async () => {
    const result = await getTimesheetSummary(PROJECT_ID)

    expect(result).toHaveProperty('data')
    const data = (result as { data: Record<string, number> }).data
    expect(data.weekHours).toBe(6)
    expect(data.billableHours).toBe(4)
    expect(data.nonBillableHours).toBe(2)
  })
})
