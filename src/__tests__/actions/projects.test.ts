import { vi, describe, it, expect, beforeEach } from 'vitest'
import { UserRole } from '@prisma/client'

// RESOLVED: G003 — Testes de contrato para Server Actions de projects
// Cobre os mesmos cenários BDD que GET/POST /api/projects e GET/PATCH /api/projects/[id] cobririam

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
  withProjectAccess: vi.fn(),
  requireFinancialAccess: vi.fn(),
  canAssignRole: vi.fn(),
}))

import { withProjectAccess, requireFinancialAccess, canAssignRole } from '@/lib/rbac'

const mockWithProjectAccess = vi.mocked(withProjectAccess)
const _mockRequireFinancialAccess = vi.mocked(requireFinancialAccess)
const mockCanAssignRole = vi.mocked(canAssignRole)

// ─── MOCK PRISMA ──────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    projectMember: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

const mockProjectFindMany = vi.mocked(prisma.project.findMany)
const mockProjectFindUnique = vi.mocked(prisma.project.findUnique)
const mockProjectCreate = vi.mocked(prisma.project.create)
const mockProjectUpdate = vi.mocked(prisma.project.update)
const mockProjectCount = vi.mocked(prisma.project.count)
const mockMemberFindMany = vi.mocked(prisma.projectMember.findMany)
const mockMemberCreate = vi.mocked(prisma.projectMember.create)
const mockMemberDelete = vi.mocked(prisma.projectMember.delete)

// ─── IMPORT ACTIONS ───────────────────────────────────────────────────────────

import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
} from '@/actions/projects'

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

const ORG_ID = 'org-001'
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000'
const USER_ID = '660e8400-e29b-41d4-a716-446655440001'
const OTHER_USER_ID = '770e8400-e29b-41d4-a716-446655440002'

const fakeSocio = {
  id: USER_ID,
  name: 'Sócio User',
  email: 'socio@test.com',
  role: UserRole.SOCIO,
  organizationId: ORG_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  avatarUrl: null,
}

const fakePM = { ...fakeSocio, role: UserRole.PM }
const fakeDev = { ...fakeSocio, role: UserRole.DEV }

const fakeProject = {
  id: PROJECT_ID,
  name: 'Projeto Teste',
  slug: 'projeto-teste',
  description: 'Desc',
  status: 'ACTIVE',
  organizationId: ORG_ID,
  members: [],
  _count: { tasks: 0 },
  brief: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const fakeMember = {
  id: 'mem-001',
  projectId: PROJECT_ID,
  userId: OTHER_USER_ID,
  role: UserRole.DEV,
  user: { id: OTHER_USER_ID, name: 'Dev User', email: 'dev@test.com', avatarUrl: null, role: UserRole.DEV },
  createdAt: new Date(),
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('getProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeSocio as never)
    mockProjectFindMany.mockResolvedValue([fakeProject] as never)
    mockProjectCount.mockResolvedValue(1 as never)
  })

  it('[SUCCESS] retorna lista paginada de projetos do usuário', async () => {
    const result = await getProjects()

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('total', 1)
    expect(result).toHaveProperty('page', 1)
    expect(mockProjectFindMany).toHaveBeenCalledTimes(1)
  })

  it('[SUCCESS] aceita filtro de status', async () => {
    await getProjects({ status: 'ACTIVE', page: 2, limit: 5 })

    expect(mockProjectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        where: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    )
  })

  it('[ERROR] retorna erro quando getAuthUser falha', async () => {
    mockGetAuthUser.mockRejectedValue(new Error('Unauthorized'))

    const result = await getProjects()

    expect(result).toHaveProperty('error')
  })
})

describe('getProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeSocio as never)
    mockWithProjectAccess.mockResolvedValue({ projectRole: UserRole.SOCIO } as never)
    mockProjectFindUnique.mockResolvedValue(fakeProject as never)
  })

  it('[SUCCESS] retorna projeto com membros e contagens', async () => {
    const result = await getProject(PROJECT_ID)

    expect(result).toHaveProperty('data')
    expect(mockWithProjectAccess).toHaveBeenCalledWith(USER_ID, PROJECT_ID)
  })

  it('[ERROR] retorna 404 quando projeto não existe', async () => {
    mockProjectFindUnique.mockResolvedValue(null)

    const result = await getProject(PROJECT_ID)

    expect(result).toHaveProperty('error')
  })

  it('[ERROR] retorna erro quando usuário não tem acesso ao projeto', async () => {
    mockWithProjectAccess.mockRejectedValue(new Error('Forbidden'))

    const result = await getProject(PROJECT_ID)

    expect(result).toHaveProperty('error')
  })
})

describe('createProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProjectCreate.mockResolvedValue(fakeProject as never)
  })

  it('[SUCCESS] SOCIO cria projeto com slug gerado', async () => {
    mockGetAuthUser.mockResolvedValue(fakeSocio as never)

    const result = await createProject({ name: 'Projeto Teste', description: 'Desc', currency: 'BRL' })

    expect(result).toHaveProperty('data')
    expect(mockProjectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'projeto-teste', organizationId: ORG_ID }),
      }),
    )
  })

  it('[SUCCESS] PM cria projeto', async () => {
    mockGetAuthUser.mockResolvedValue(fakePM as never)

    const result = await createProject({ name: 'Outro Projeto', currency: 'BRL' })

    expect(result).toHaveProperty('data')
  })

  it('[ERROR] DEV não pode criar projeto (403)', async () => {
    mockGetAuthUser.mockResolvedValue(fakeDev as never)

    const result = await createProject({ name: 'Projeto Dev', currency: 'BRL' })

    expect(result).toHaveProperty('error')
  })

  it('[ERROR] nome vazio falha na validação Zod', async () => {
    mockGetAuthUser.mockResolvedValue(fakeSocio as never)

    const result = await createProject({ name: '', currency: 'BRL' })

    expect(result).toHaveProperty('error')
  })
})

describe('updateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakePM as never)
    mockWithProjectAccess.mockResolvedValue({ projectRole: UserRole.PM } as never)
    mockProjectUpdate.mockResolvedValue({ ...fakeProject, name: 'Nome Atualizado' } as never)
  })

  it('[SUCCESS] PM atualiza projeto', async () => {
    const result = await updateProject(PROJECT_ID, { name: 'Nome Atualizado' })

    expect(result).toHaveProperty('data')
    expect(mockProjectUpdate).toHaveBeenCalledTimes(1)
  })

  it('[ERROR] retorna erro quando acesso negado (sem role PM+)', async () => {
    mockWithProjectAccess.mockRejectedValue(new Error('Forbidden'))

    const result = await updateProject(PROJECT_ID, { name: 'Tentativa' })

    expect(result).toHaveProperty('error')
  })
})

describe('getProjectMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeSocio as never)
    mockWithProjectAccess.mockResolvedValue({ projectRole: UserRole.SOCIO } as never)
    mockMemberFindMany.mockResolvedValue([fakeMember] as never)
  })

  it('[SUCCESS] retorna lista de membros com dados do usuário', async () => {
    const result = await getProjectMembers(PROJECT_ID)

    expect(result).toHaveProperty('data')
    expect(Array.isArray((result as { data: unknown[] }).data)).toBe(true)
  })
})

describe('addProjectMember', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakeSocio as never)
    mockWithProjectAccess.mockResolvedValue({ projectRole: UserRole.SOCIO } as never)
    mockCanAssignRole.mockReturnValue(true)
    mockMemberCreate.mockResolvedValue(fakeMember as never)
  })

  it('[SUCCESS] SOCIO adiciona membro DEV', async () => {
    const result = await addProjectMember(PROJECT_ID, { userId: OTHER_USER_ID, role: UserRole.DEV })

    expect(result).toHaveProperty('data')
    expect(mockMemberCreate).toHaveBeenCalledTimes(1)
  })

  it('[ERROR] bloqueia escalada de role (canAssignRole false)', async () => {
    mockCanAssignRole.mockReturnValue(false)

    const result = await addProjectMember(PROJECT_ID, { userId: OTHER_USER_ID, role: UserRole.SOCIO })

    expect(result).toHaveProperty('error')
  })

  it('[EDGE] retorna erro quando userId inválido (Zod)', async () => {
    const result = await addProjectMember(PROJECT_ID, { userId: '', role: UserRole.DEV })

    expect(result).toHaveProperty('error')
  })
})

describe('removeProjectMember', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue(fakePM as never)
    mockWithProjectAccess.mockResolvedValue({ projectRole: UserRole.PM } as never)
    mockMemberDelete.mockResolvedValue(fakeMember as never)
  })

  it('[SUCCESS] PM remove membro do projeto', async () => {
    const result = await removeProjectMember(PROJECT_ID, OTHER_USER_ID)

    expect(result).toHaveProperty('success', true)
    expect(mockMemberDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId_userId: { projectId: PROJECT_ID, userId: OTHER_USER_ID } },
      }),
    )
  })

  it('[ERROR] retorna erro quando usuário não tem acesso PM+', async () => {
    mockWithProjectAccess.mockRejectedValue(new Error('Forbidden'))

    const result = await removeProjectMember(PROJECT_ID, OTHER_USER_ID)

    expect(result).toHaveProperty('error')
  })
})
