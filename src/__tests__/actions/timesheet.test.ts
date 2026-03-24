// src/__tests__/actions/timesheet.test.ts
// BE-11 — Suite de testes para Server Actions de Timesheet (module-14-rentabilia-timesheet)
// Cobre: happy path, validação/erros, edge cases

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    timesheetEntry: {
      findMany:  vi.fn(),
      findUnique: vi.fn(),
      count:     vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/get-user', () => ({
  requireServerUser: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  withProjectAccess: vi.fn().mockResolvedValue({ projectRole: 'PM' }),
  requireFinancialAccess: vi.fn(),
  hasRole: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/utils/date-helpers', () => ({
  getISOWeekStart: vi.fn().mockReturnValue(new Date('2025-01-06')),
  getISOWeekNumber: vi.fn().mockReturnValue(2),
}))

// ─── Importações após mocks ──────────────────────────────────────────────────

import { getTimeEntries, logTime, deleteTimeEntry } from '@/actions/rentabilia'
import { requireServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { hasRole } from '@/lib/rbac'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const pmUser = {
  id: 'pm-1',
  role: 'PM',
  email: 'pm@test.com',
  organizationId: 'org-1',
  name: 'PM User',
} as any

const devUser = {
  id: 'dev-1',
  role: 'DEV',
  email: 'dev@test.com',
  organizationId: 'org-1',
  name: 'Dev User',
} as any

const mockEntry = {
  id: 'entry-1',
  projectId: 'proj-1',
  userId: 'dev-1',
  taskId: null,
  hours: 4,
  role: 'DEV',
  workDate: new Date('2025-01-15'),
  description: 'Desenvolvimento da feature',
  notes: null,
  billable: true,
  deletedAt: null,
  createdAt: new Date(),
  user: { id: 'dev-1', name: 'Dev User', role: 'DEV' },
  task: null,
}

// ─── GET TIME ENTRIES ─────────────────────────────────────────────────────────

describe('getTimeEntries — happy path', () => {
  beforeEach(() => vi.clearAllMocks())

  it('PM retorna todas as entradas do projeto', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(pmUser)
    vi.mocked(hasRole).mockReturnValue(true) // PM pode ver tudo
    vi.mocked(prisma.timesheetEntry.findMany).mockResolvedValue([mockEntry] as any)
    vi.mocked(prisma.timesheetEntry.count).mockResolvedValue(1)

    const result = await getTimeEntries({ projectId: 'proj-1' })

    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    }
  })

  it('DEV só retorna as próprias entradas', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser)
    vi.mocked(hasRole).mockReturnValue(false) // DEV não tem acesso amplo
    vi.mocked(prisma.timesheetEntry.findMany).mockResolvedValue([mockEntry] as any)
    vi.mocked(prisma.timesheetEntry.count).mockResolvedValue(1)

    const result = await getTimeEntries({ projectId: 'proj-1' })

    expect('error' in result).toBe(false)
    // userId fixo em dev-1 na query
    const call = vi.mocked(prisma.timesheetEntry.findMany).mock.calls[0][0]
    expect((call?.where as any)?.userId).toBe('dev-1')
  })

  it('filtra por semana ISO corretamente', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(pmUser)
    vi.mocked(hasRole).mockReturnValue(true)
    vi.mocked(prisma.timesheetEntry.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.timesheetEntry.count).mockResolvedValue(0)

    await getTimeEntries({ projectId: 'proj-1', week: '2025-W02' })

    const call = vi.mocked(prisma.timesheetEntry.findMany).mock.calls[0][0]
    expect((call?.where as any)?.workDate).toBeDefined()
  })

  it('pagina corretamente com page e limit', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(pmUser)
    vi.mocked(hasRole).mockReturnValue(true)
    vi.mocked(prisma.timesheetEntry.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.timesheetEntry.count).mockResolvedValue(0)

    await getTimeEntries({ projectId: 'proj-1', page: 2, limit: 10 })

    const call = vi.mocked(prisma.timesheetEntry.findMany).mock.calls[0][0]
    expect(call?.skip).toBe(10) // (2-1) * 10
    expect(call?.take).toBe(10)
  })
})

// ─── LOG TIME (CREATE) ────────────────────────────────────────────────────────

describe('logTime — happy path', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cria entrada com horas válidas (múltiplo de 0.25)', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser)
    vi.mocked(prisma.task.findFirst).mockResolvedValue(null) // sem taskId
    vi.mocked(prisma.timesheetEntry.create).mockResolvedValue(mockEntry as any)

    const result = await logTime({
      projectId: 'proj-1',
      hours: 2.5,
      role: 'DEV' as any,
      workDate: '2025-01-15',
      billable: true,
    })

    expect('error' in result).toBe(false)
  })

  it('cria entrada com horas = 0.25 (mínimo válido)', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser)
    vi.mocked(prisma.timesheetEntry.create).mockResolvedValue({
      ...mockEntry,
      hours: 0.25,
    } as any)

    const result = await logTime({
      projectId: 'proj-1',
      hours: 0.25,
      role: 'DEV' as any,
      workDate: '2025-01-15',
      billable: true,
    })

    expect('error' in result).toBe(false)
  })
})

describe('logTime — validação', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejeita data futura', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const futureDate = tomorrow.toISOString().split('T')[0]

    const result = await logTime({
      projectId: 'proj-1',
      hours: 4,
      role: 'DEV' as any,
      workDate: futureDate,
      billable: true,
    })

    expect('error' in result).toBe(true)
  })

  it('rejeita horas não múltiplas de 0.25', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser)

    const result = await logTime({
      projectId: 'proj-1',
      hours: 1.3, // não é múltiplo de 0.25
      role: 'DEV' as any,
      workDate: '2025-01-15',
      billable: true,
    })

    expect('error' in result).toBe(true)
  })

  it('rejeita horas > 24', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser)

    const result = await logTime({
      projectId: 'proj-1',
      hours: 25,
      role: 'DEV' as any,
      workDate: '2025-01-15',
      billable: true,
    })

    expect('error' in result).toBe(true)
  })

  it('rejeita taskId que não pertence ao projeto', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser)
    vi.mocked(prisma.task.findFirst).mockResolvedValue(null) // task não encontrada no projeto

    const result = await logTime({
      projectId: 'proj-1',
      taskId: 'task-de-outro-projeto',
      hours: 2,
      role: 'DEV' as any,
      workDate: '2025-01-15',
      billable: true,
    })

    expect('error' in result).toBe(true)
  })
})

describe('logTime — edge cases', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cria entrada sem taskId (campo opcional)', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser)
    vi.mocked(prisma.timesheetEntry.create).mockResolvedValue(mockEntry as any)

    const result = await logTime({
      projectId: 'proj-1',
      hours: 8,
      role: 'DEV' as any,
      workDate: '2025-01-15',
      billable: true,
    })

    // prisma.task.findFirst não deve ser chamado sem taskId
    expect(prisma.task.findFirst).not.toHaveBeenCalled()
    expect('error' in result).toBe(false)
  })

  it('entry com billable = false é permitido', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser)
    vi.mocked(prisma.timesheetEntry.create).mockResolvedValue({
      ...mockEntry,
      billable: false,
    } as any)

    const result = await logTime({
      projectId: 'proj-1',
      hours: 4,
      role: 'DEV' as any,
      workDate: '2025-01-15',
      billable: false,
    })

    expect('error' in result).toBe(false)
  })
})

// ─── DELETE TIME ENTRY ────────────────────────────────────────────────────────

describe('deleteTimeEntry — happy path', () => {
  beforeEach(() => vi.clearAllMocks())

  it('soft-delete da própria entry dentro da janela de 7 dias', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser)
    vi.mocked(prisma.timesheetEntry.findUnique).mockResolvedValue({
      ...mockEntry,
      workDate: new Date(), // hoje — dentro da janela
    } as any)
    vi.mocked(prisma.timesheetEntry.update).mockResolvedValue(mockEntry as any)

    const result = await deleteTimeEntry('entry-1')

    expect('error' in result).toBe(false)
    expect(prisma.timesheetEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    )
  })
})

describe('deleteTimeEntry — validação', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna erro para entry inexistente', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser)
    vi.mocked(prisma.timesheetEntry.findUnique).mockResolvedValue(null)

    const result = await deleteTimeEntry('nao-existe')

    expect('error' in result).toBe(true)
  })

  it('DEV não pode deletar entry de outro usuário', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser) // dev-1
    vi.mocked(prisma.timesheetEntry.findUnique).mockResolvedValue({
      ...mockEntry,
      userId: 'outro-dev-2', // entry de outro usuário
    } as any)

    const result = await deleteTimeEntry('entry-1')

    expect('error' in result).toBe(true)
  })

  it('rejeita delete fora da janela de 7 dias (entry antiga)', async () => {
    vi.mocked(requireServerUser).mockResolvedValue(devUser)

    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 10) // 10 dias atrás

    vi.mocked(prisma.timesheetEntry.findUnique).mockResolvedValue({
      ...mockEntry,
      userId: 'dev-1',
      workDate: oldDate,
    } as any)

    const result = await deleteTimeEntry('entry-1')

    expect('error' in result).toBe(true)
  })
})
