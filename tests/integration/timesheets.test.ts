/**
 * Integration Tests: Timesheets — Server Actions
 *
 * logTime — registra horas no projeto
 * getTimeEntries — lista horas (com filtros)
 *
 * Auth mockada; Prisma real.
 *
 * Ref: RentabilIA (RF05), US-015, US-016
 * Error codes: TIMESHEET_001, TIMESHEET_050, AUTH_003, AUTH_005, VAL_001-004
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  createTestOrg,
  createTestUser,
  createTestProject,
  addProjectMember,
  cleanTestOrg,
} from './helpers/factory.helper'

// ─── MOCK AUTH ────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
  getAuthUserOrNull: vi.fn(),
}))

import { getAuthUser } from '@/lib/auth'
const mockGetAuthUser = vi.mocked(getAuthUser)

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
import { logTime, getTimeEntries } from '@/actions/rentabilia'

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

let orgId: string
let devId: string
let pmId: string
let clienteId: string
let projectId: string

beforeAll(async () => {
  const org = await createTestOrg({ name: 'Timesheets Test Org', slug: 'timesheets-test-org' })
  orgId = org.id

  const dev = await createTestUser(orgId, UserRole.DEV, { email: 'dev@timesheet.test' })
  devId = dev.id

  const pm = await createTestUser(orgId, UserRole.PM, { email: 'pm@timesheet.test' })
  pmId = pm.id

  const cliente = await createTestUser(orgId, UserRole.CLIENTE, { email: 'cliente@timesheet.test' })
  clienteId = cliente.id

  const project = await createTestProject(orgId, { name: 'Projeto Timesheets' })
  await addProjectMember(project.id, devId, UserRole.DEV)
  await addProjectMember(project.id, pmId, UserRole.PM)
  await addProjectMember(project.id, clienteId, UserRole.CLIENTE)
  projectId = project.id
})

afterAll(async () => {
  await cleanTestOrg(orgId)
})

function buildUser(id: string, role: UserRole) {
  return { id, organizationId: orgId, role, email: `${role.toLowerCase()}@timesheet.test`, name: `${role} Test`, avatarUrl: null } as never
}

// ─── TESTES: logTime ──────────────────────────────────────────────────────────

describe('logTime', () => {
  it('[1] DEV registra horas e persiste no banco', async () => {
    mockGetAuthUser.mockResolvedValue(buildUser(devId, UserRole.DEV))

    const today = new Date().toISOString().split('T')[0]
    const result = await logTime({
      projectId,
      hours: 4,
      date: today,
      description: 'Desenvolvimento de feature X',
    })

    expect(result).not.toHaveProperty('error')
    const entry = (result as unknown as { entry: { id: string; hours: number } }).entry
    expect(entry.hours).toBe(4)

    // Verificar no banco
    const dbEntry = await prisma.timesheetEntry.findUnique({ where: { id: entry.id } })
    expect(dbEntry).not.toBeNull()
    expect(dbEntry!.userId).toBe(devId)
    expect(dbEntry!.projectId).toBe(projectId)

    // Cleanup
    await prisma.timesheetEntry.delete({ where: { id: entry.id } })
  })

  it('[2] rejeita hours <= 0 (VAL_003)', async () => {
    mockGetAuthUser.mockResolvedValue(buildUser(devId, UserRole.DEV))

    const result = await logTime({
      projectId,
      hours: 0,
      date: new Date().toISOString().split('T')[0],
      description: 'Zero horas',
    })

    expect(result).toHaveProperty('error')
  })

  it('[2] rejeita hours > 24 (VAL_003)', async () => {
    mockGetAuthUser.mockResolvedValue(buildUser(devId, UserRole.DEV))

    const result = await logTime({
      projectId,
      hours: 25,
      date: new Date().toISOString().split('T')[0],
      description: 'Mais de 24 horas',
    })

    expect(result).toHaveProperty('error')
  })

  it('[3] CLIENTE não pode registrar horas (AUTH_005)', async () => {
    mockGetAuthUser.mockResolvedValue(buildUser(clienteId, UserRole.CLIENTE))

    const result = await logTime({
      projectId,
      hours: 2,
      date: new Date().toISOString().split('T')[0],
      description: 'Cliente tentando logar horas',
    })

    expect(result).toHaveProperty('error')
    const errorResult = result as { error: string; code?: string }
    expect(errorResult.code ?? errorResult.error).toMatch(/AUTH_005|permissão|autorizado/i)
  })

  it('[4] não registra horas em projeto de outra organização (IDOR)', async () => {
    const otherOrg = await createTestOrg({ name: 'Other Org TS IDOR', slug: 'other-org-ts-idor' })
    const otherDev = await createTestUser(otherOrg.id, UserRole.DEV)
    const otherProject = await createTestProject(otherOrg.id, { name: 'Projeto IDOR TS' })
    await addProjectMember(otherProject.id, otherDev.id, UserRole.DEV)

    mockGetAuthUser.mockResolvedValue(buildUser(devId, UserRole.DEV))

    const result = await logTime({
      projectId: otherProject.id,
      hours: 2,
      date: new Date().toISOString().split('T')[0],
      description: 'IDOR timesheet',
    })

    expect(result).toHaveProperty('error')

    // Verificar que não criou no banco
    const count = await prisma.timesheetEntry.count({ where: { projectId: otherProject.id } })
    expect(count).toBe(0)

    // Cleanup
    await prisma.projectMember.deleteMany({ where: { projectId: otherProject.id } })
    await prisma.project.delete({ where: { id: otherProject.id } })
    await prisma.user.delete({ where: { id: otherDev.id } })
    await prisma.organization.delete({ where: { id: otherOrg.id } })
  })
})

// ─── TESTES: getTimeEntries ───────────────────────────────────────────────────

describe('getTimeEntries', () => {
  it('[1] PM vê todos os registros do projeto', async () => {
    mockGetAuthUser.mockResolvedValue(buildUser(pmId, UserRole.PM))

    // Criar entries diretamente no banco
    const entry = await prisma.timesheetEntry.create({
      data: {
        id: require('crypto').randomUUID(),
        userId: devId,
        projectId,
        hours: 3,
        date: new Date(),
        description: 'Entry para listagem PM',
        role: UserRole.DEV,
      },
    })

    const result = await getTimeEntries({ projectId })

    expect(result).not.toHaveProperty('error')
    const data = (result as { data: { id: string }[] }).data
    expect(Array.isArray(data)).toBe(true)
    const found = data.find((e) => e.id === entry.id)
    expect(found).toBeDefined()

    await prisma.timesheetEntry.delete({ where: { id: entry.id } })
  })

  it('[1] DEV vê apenas seus próprios registros (isolamento por userId)', async () => {
    mockGetAuthUser.mockResolvedValue(buildUser(devId, UserRole.DEV))

    // Entry do DEV
    const devEntry = await prisma.timesheetEntry.create({
      data: {
        id: require('crypto').randomUUID(),
        userId: devId,
        projectId,
        hours: 2,
        date: new Date(),
        description: 'Entry do DEV',
        role: UserRole.DEV,
      },
    })

    // Entry do PM (não deve aparecer para o DEV)
    const pmEntry = await prisma.timesheetEntry.create({
      data: {
        id: require('crypto').randomUUID(),
        userId: pmId,
        projectId,
        hours: 1,
        date: new Date(),
        description: 'Entry do PM',
        role: UserRole.PM,
      },
    })

    const result = await getTimeEntries({ projectId })
    const data = (result as { data: { id: string }[] }).data
    const ids = data.map((e) => e.id)

    expect(ids).toContain(devEntry.id)
    expect(ids).not.toContain(pmEntry.id)

    await prisma.timesheetEntry.deleteMany({ where: { id: { in: [devEntry.id, pmEntry.id] } } })
  })
})
