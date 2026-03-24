import { prisma } from '@/lib/db'
import { UserRole, ProjectStatus, DocumentType, DocumentStatus, TaskStatus } from '@prisma/client'
import { randomUUID } from 'crypto'
import { createHash } from 'crypto'

// ─── COUNTER ──────────────────────────────────────────────────────────────────

let _counter = 0
const uid = () => `${Date.now()}-${++_counter}`

// ─── FACTORIES ────────────────────────────────────────────────────────────────

export async function createTestOrg(
  overrides: Partial<{ name: string; slug: string }> = {},
) {
  const name = overrides.name ?? `Org ${uid()}`
  return prisma.organization.create({
    data: {
      id: randomUUID(),
      name,
      slug: overrides.slug ?? name.toLowerCase().replace(/\s+/g, '-'),
    },
  })
}

export async function createTestUser(
  orgId: string,
  role: UserRole = UserRole.DEV,
  overrides: Partial<{ name: string; email: string }> = {},
) {
  return prisma.user.create({
    data: {
      id: randomUUID(),
      organizationId: orgId,
      email: overrides.email ?? `user-${uid()}@test.local`,
      name: overrides.name ?? `User ${uid()}`,
      role,
    },
  })
}

export async function createTestProject(
  orgId: string,
  overrides: Partial<{
    name: string
    status: ProjectStatus
    revenue: number
  }> = {},
) {
  const name = overrides.name ?? `Project ${uid()}`
  return prisma.project.create({
    data: {
      id: randomUUID(),
      organizationId: orgId,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      status: overrides.status ?? ProjectStatus.BRIEFING,
      revenue: overrides.revenue ?? null,
      currency: 'BRL',
    },
  })
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: UserRole = UserRole.DEV,
) {
  return prisma.projectMember.create({
    data: {
      id: randomUUID(),
      projectId,
      userId,
      role,
    },
  })
}

export async function createTestDocument(
  projectId: string,
  createdBy: string,
  overrides: Partial<{
    type: DocumentType
    title: string
    status: DocumentStatus
  }> = {},
) {
  const content = '# Documento de Teste\n\nConteúdo de teste para integração.'
  const doc = await prisma.document.create({
    data: {
      id: randomUUID(),
      projectId,
      createdBy,
      type: overrides.type ?? DocumentType.PRD,
      title: overrides.title ?? `Documento ${uid()}`,
      status: overrides.status ?? DocumentStatus.DRAFT,
      currentVersion: 1,
    },
  })
  // Criar versão inicial
  await prisma.documentVersion.create({
    data: {
      id: randomUUID(),
      documentId: doc.id,
      createdBy,
      versionNumber: 1,
      content,
      contentHash: createHash('sha256').update(content).digest('hex'),
    },
  })
  return doc
}

export async function createTestTask(
  projectId: string,
  assigneeId: string,
  overrides: Partial<{
    title: string
    status: TaskStatus
    estimatedHours: number
  }> = {},
) {
  return prisma.task.create({
    data: {
      id: randomUUID(),
      projectId,
      assigneeId,
      title: overrides.title ?? `Task ${uid()}`,
      status: overrides.status ?? TaskStatus.TODO,
      estimatedHours: overrides.estimatedHours ?? 4,
      isInScope: true,
    },
  })
}

export async function createTestTimesheetEntry(
  userId: string,
  projectId: string,
  overrides: Partial<{
    hours: number
    date: Date
    description: string
  }> = {},
) {
  return prisma.timesheetEntry.create({
    data: {
      id: randomUUID(),
      userId,
      projectId,
      hours: overrides.hours ?? 2,
      date: overrides.date ?? new Date(),
      description: overrides.description ?? `Trabalho ${uid()}`,
      role: UserRole.DEV,
    },
  })
}

// ─── CLEANUP ──────────────────────────────────────────────────────────────────

/**
 * Remove todos os dados associados a uma organização de teste.
 * Respeita ordem de dependências FK para evitar erros de constraint.
 */
export async function cleanTestOrg(orgId: string) {
  // Deletar em ordem inversa das dependências
  try {
    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { user: { organizationId: orgId } } }),
      prisma.notification.deleteMany({ where: { user: { organizationId: orgId } } }),
      prisma.notificationPreference.deleteMany({ where: { user: { organizationId: orgId } } }),
      prisma.approvalRequest.deleteMany({ where: { project: { organizationId: orgId } } }),
      prisma.briefSession.deleteMany({ where: { brief: { project: { organizationId: orgId } } } }),
      prisma.timesheetEntry.deleteMany({ where: { project: { organizationId: orgId } } }),
      prisma.task.deleteMany({ where: { project: { organizationId: orgId } } }),
      prisma.documentVersion.deleteMany({
        where: { document: { project: { organizationId: orgId } } },
      }),
      prisma.document.deleteMany({ where: { project: { organizationId: orgId } } }),
      prisma.changeOrder.deleteMany({ where: { project: { organizationId: orgId } } }),
      prisma.brief.deleteMany({ where: { project: { organizationId: orgId } } }),
      prisma.projectMember.deleteMany({ where: { project: { organizationId: orgId } } }),
      prisma.project.deleteMany({ where: { organizationId: orgId } }),
      prisma.costRate.deleteMany({ where: { organizationId: orgId } }),
      prisma.user.deleteMany({ where: { organizationId: orgId } }),
      prisma.organization.deleteMany({ where: { id: orgId } }),
    ])
  } catch (err) {
    // Log mas não lança — cleanup parcial é aceitável em testes
    console.warn('[cleanTestOrg] Cleanup parcial para org', orgId, err)
  }
}
