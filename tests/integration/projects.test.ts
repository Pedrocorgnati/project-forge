/**
 * Integration Tests: Projects — Server Actions
 *
 * Testa as actions de projects contra banco real.
 * Auth mockada via vi.mock('@/lib/auth').
 * Prisma NÃO mockado — exercita queries reais.
 *
 * Cenários cobertos por action:
 *   [1] Happy path (sucesso + verificação no banco)
 *   [2] Erro de validação (VAL_*)
 *   [3] Autenticação/Autorização (AUTH_*)
 *   [4] Segurança (IDOR, mass assignment, cross-org)
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { UserRole, ProjectStatus } from '@prisma/client'
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

vi.mock('@/lib/rbac', async (importOriginal) => {
  // Manter implementação real do rbac — ele usa Prisma real
  return importOriginal()
})

import { getAuthUser } from '@/lib/auth'
const mockGetAuthUser = vi.mocked(getAuthUser)

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  getProjectMembers,
  addProjectMember as addMemberAction,
  removeProjectMember,
} from '@/actions/projects'

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

let orgId: string
let socioId: string
let pmId: string
let devId: string
let otherOrgId: string

beforeAll(async () => {
  // Criar organização + usuários de teste
  const org = await createTestOrg({ name: 'Projects Test Org', slug: 'projects-test-org' })
  orgId = org.id

  const socio = await createTestUser(orgId, UserRole.SOCIO, { email: 'socio@projects.test' })
  socioId = socio.id

  const pm = await createTestUser(orgId, UserRole.PM, { email: 'pm@projects.test' })
  pmId = pm.id

  const dev = await createTestUser(orgId, UserRole.DEV, { email: 'dev@projects.test' })
  devId = dev.id

  // Organização de outro tenant (para testes de isolamento)
  const otherOrg = await createTestOrg({ name: 'Other Org', slug: 'other-org-projects' })
  otherOrgId = otherOrg.id
})

afterAll(async () => {
  await cleanTestOrg(orgId)
  await cleanTestOrg(otherOrgId)
})

// ─── TESTES: getProjects ───────────────────────────────────────────────────────

describe('getProjects', () => {
  it('[1] retorna projetos da organização do usuário autenticado', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: pmId,
      organizationId: orgId,
      role: UserRole.PM,
    } as never)

    // Criar projeto com PM como membro
    const project = await createTestProject(orgId, { name: 'Projeto Listagem' })
    await addProjectMember(project.id, pmId, UserRole.PM)

    const result = await getProjects()

    expect(result).not.toHaveProperty('error')
    const data = (result as { data: unknown[] }).data
    expect(Array.isArray(data)).toBe(true)
    const found = data.find((p: any) => p.id === project.id)
    expect(found).toBeDefined()

    // Cleanup parcial
    await prisma.projectMember.deleteMany({ where: { projectId: project.id } })
    await prisma.project.delete({ where: { id: project.id } })
  })

  it('[2] retorna lista vazia quando usuário não tem projetos', async () => {
    const newUser = await createTestUser(orgId, UserRole.DEV, { email: 'noprojects@test.local' })
    mockGetAuthUser.mockResolvedValue({
      id: newUser.id,
      organizationId: orgId,
      role: UserRole.DEV,
    } as never)

    const result = await getProjects()

    expect(result).not.toHaveProperty('error')
    const data = (result as { data: unknown[] }).data
    expect(data).toHaveLength(0)

    await prisma.user.delete({ where: { id: newUser.id } })
  })

  it('[4] não expõe projetos de outra organização (isolamento multi-tenant)', async () => {
    // Criar projeto em outra org
    const otherUser = await createTestUser(otherOrgId, UserRole.PM)
    const otherProject = await createTestProject(otherOrgId, {
      name: 'Projeto Outra Org',
    })
    await addProjectMember(otherProject.id, otherUser.id, UserRole.PM)

    // Usuário da org principal — NÃO deve ver projeto da outra org
    mockGetAuthUser.mockResolvedValue({
      id: pmId,
      organizationId: orgId,
      role: UserRole.PM,
    } as never)

    const result = await getProjects()
    const data = (result as { data: { id: string }[] }).data
    const crossOrgLeak = data.find((p) => p.id === otherProject.id)
    expect(crossOrgLeak).toBeUndefined()

    // Cleanup
    await prisma.projectMember.deleteMany({ where: { projectId: otherProject.id } })
    await prisma.project.delete({ where: { id: otherProject.id } })
    await prisma.user.delete({ where: { id: otherUser.id } })
  })
})

// ─── TESTES: createProject ────────────────────────────────────────────────────

describe('createProject', () => {
  it('[1] cria projeto e persiste no banco com status BRIEFING', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: pmId,
      organizationId: orgId,
      role: UserRole.PM,
    } as never)

    const result = await createProject({
      name: 'Projeto Integração Create',
      description: 'Teste de criação via integração',
      currency: 'BRL',
    })

    expect(result).not.toHaveProperty('error')
    const project = (result as unknown as { project: { id: string; status: string } }).project
    expect(project.status).toBe(ProjectStatus.BRIEFING)

    // Verificar no banco
    const dbProject = await prisma.project.findUnique({ where: { id: project.id } })
    expect(dbProject).not.toBeNull()
    expect(dbProject!.name).toBe('Projeto Integração Create')
    expect(dbProject!.organizationId).toBe(orgId)

    // Cleanup
    await prisma.projectMember.deleteMany({ where: { projectId: project.id } })
    await prisma.brief.deleteMany({ where: { projectId: project.id } })
    await prisma.project.delete({ where: { id: project.id } })
  })

  it('[2] rejeita nome com menos de 3 caracteres (VAL_004)', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: pmId,
      organizationId: orgId,
      role: UserRole.PM,
    } as never)

    const result = await createProject({ name: 'AB' } as never)

    expect(result).toHaveProperty('error')
  })

  it('[2] rejeita revenue negativo (VAL_003)', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: pmId,
      organizationId: orgId,
      role: UserRole.PM,
    } as never)

    const result = await createProject({ name: 'Projeto Válido', revenue: -100 } as never)

    expect(result).toHaveProperty('error')
  })

  it('[3] rejeita criação por DEV (AUTH_005 — role insuficiente)', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: devId,
      organizationId: orgId,
      role: UserRole.DEV,
    } as never)

    const result = await createProject({ name: 'Projeto por Dev', currency: 'BRL' })

    expect(result).toHaveProperty('error')
    const errorResult = result as { error: string; code?: string }
    expect(errorResult.code ?? errorResult.error).toMatch(/AUTH_005|permissão|autorizado/i)
  })

  it('[4] não permite mass assignment de campos restritos', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: pmId,
      organizationId: orgId,
      role: UserRole.PM,
    } as never)

    // Tentar injetar organizationId de outra org
    const result = await createProject({
      name: 'Projeto Mass Assign',
      organizationId: otherOrgId,
    } as never)

    if (!('error' in result)) {
      const project = (result as unknown as { project: { id: string; organizationId: string } }).project
      // Deve pertencer à org do usuário, não à injetada
      expect(project.organizationId).toBe(orgId)
      expect(project.organizationId).not.toBe(otherOrgId)

      await prisma.projectMember.deleteMany({ where: { projectId: project.id } })
      await prisma.brief.deleteMany({ where: { projectId: project.id } })
      await prisma.project.delete({ where: { id: project.id } })
    }
  })
})

// ─── TESTES: getProject ───────────────────────────────────────────────────────

describe('getProject', () => {
  let testProjectId: string

  beforeEach(async () => {
    const project = await createTestProject(orgId, { name: 'Projeto Get Test' })
    await addProjectMember(project.id, pmId, UserRole.PM)
    testProjectId = project.id
  })

  afterAll(async () => {
    // Cleanup projetos restantes dessa suite
    await prisma.projectMember.deleteMany({ where: { project: { organizationId: orgId }, userId: pmId } })
  })

  it('[1] retorna projeto com membros para membro do projeto', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: pmId,
      organizationId: orgId,
      role: UserRole.PM,
    } as never)

    const result = await getProject(testProjectId)

    expect(result).not.toHaveProperty('error')
    const project = result as unknown as { id: string; members: unknown[] }
    expect(project.id).toBe(testProjectId)
    expect(project.members).toBeDefined()
  })

  it('[3] retorna erro para usuário não membro (AUTH_003 — IDOR prevention)', async () => {
    // Criar usuário sem acesso ao projeto
    const stranger = await createTestUser(orgId, UserRole.DEV, { email: 'stranger@test.local' })
    mockGetAuthUser.mockResolvedValue({
      id: stranger.id,
      organizationId: orgId,
      role: UserRole.DEV,
    } as never)

    const result = await getProject(testProjectId)

    expect(result).toHaveProperty('error')

    await prisma.user.delete({ where: { id: stranger.id } })
  })

  it('[4] IDOR — não revela projeto de outra org (AUTH_003/AUTH_004)', async () => {
    const otherUser = await createTestUser(otherOrgId, UserRole.PM)
    const otherProject = await createTestProject(otherOrgId, { name: 'Projeto Other Org IDOR' })
    await addProjectMember(otherProject.id, otherUser.id, UserRole.PM)

    // Usuário da org principal tenta acessar projeto de outra org pelo ID
    mockGetAuthUser.mockResolvedValue({
      id: pmId,
      organizationId: orgId,
      role: UserRole.PM,
    } as never)

    const result = await getProject(otherProject.id)

    expect(result).toHaveProperty('error')

    await prisma.projectMember.deleteMany({ where: { projectId: otherProject.id } })
    await prisma.project.delete({ where: { id: otherProject.id } })
    await prisma.user.delete({ where: { id: otherUser.id } })
  })
})

// ─── TESTES: updateProject ────────────────────────────────────────────────────

describe('updateProject', () => {
  it('[1] PM atualiza nome do projeto e persiste no banco', async () => {
    const project = await createTestProject(orgId, { name: 'Projeto Original' })
    await addProjectMember(project.id, pmId, UserRole.PM)

    mockGetAuthUser.mockResolvedValue({
      id: pmId,
      organizationId: orgId,
      role: UserRole.PM,
    } as never)

    const result = await updateProject(project.id, { name: 'Projeto Atualizado' })

    expect(result).not.toHaveProperty('error')

    // Verificar persistência no banco
    const dbProject = await prisma.project.findUnique({ where: { id: project.id } })
    expect(dbProject!.name).toBe('Projeto Atualizado')

    await prisma.projectMember.deleteMany({ where: { projectId: project.id } })
    await prisma.project.delete({ where: { id: project.id } })
  })

  it('[3] DEV não pode atualizar projeto (AUTH_005)', async () => {
    const project = await createTestProject(orgId, { name: 'Projeto Dev Update' })
    await addProjectMember(project.id, devId, UserRole.DEV)

    mockGetAuthUser.mockResolvedValue({
      id: devId,
      organizationId: orgId,
      role: UserRole.DEV,
    } as never)

    const result = await updateProject(project.id, { name: 'Tentativa Dev' })

    expect(result).toHaveProperty('error')

    // Banco não foi alterado
    const dbProject = await prisma.project.findUnique({ where: { id: project.id } })
    expect(dbProject!.name).toBe('Projeto Dev Update')

    await prisma.projectMember.deleteMany({ where: { projectId: project.id } })
    await prisma.project.delete({ where: { id: project.id } })
  })

  it('[2] rejeita nome muito curto (VAL_004)', async () => {
    const project = await createTestProject(orgId, { name: 'Projeto Nome Curto' })
    await addProjectMember(project.id, pmId, UserRole.PM)

    mockGetAuthUser.mockResolvedValue({
      id: pmId,
      organizationId: orgId,
      role: UserRole.PM,
    } as never)

    const result = await updateProject(project.id, { name: 'AB' } as never)

    expect(result).toHaveProperty('error')

    await prisma.projectMember.deleteMany({ where: { projectId: project.id } })
    await prisma.project.delete({ where: { id: project.id } })
  })
})
