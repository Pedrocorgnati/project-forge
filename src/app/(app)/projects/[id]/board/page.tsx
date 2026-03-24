// src/app/(app)/projects/[id]/board/page.tsx
// Server Component — Kanban board page (module-9-scopeshield-board)

import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { BoardPageClient } from './board-client'
import { ScopeAlertBanner } from '@/components/scope-alerts/ScopeAlertBanner'
import type { TaskWithAssignee, KanbanConfig } from '@/types/board'
import { UserRole } from '@prisma/client'

interface BoardPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: BoardPageProps): Promise<Metadata> {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: { name: true },
  })

  return {
    title: project ? `Board — ${project.name}` : 'Board',
    description: 'Kanban board de tarefas do projeto',
  }
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id: projectId } = await params
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  // Verify project access
  let projectRole: string
  try {
    const access = await withProjectAccess(user.id, projectId)
    projectRole = access.projectRole ?? user.role
  } catch {
    redirect('/projects')
  }

  // Parallel data fetching
  const [tasks, project, members] = await Promise.all([
    prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    }),
  ])

  if (!project) {
    notFound()
  }

  const isCliente = projectRole === UserRole.CLIENTE
  const isPMorSocio = projectRole === UserRole.PM || projectRole === UserRole.SOCIO

  const config: KanbanConfig = {
    projectId,
    canEdit: !isCliente,
    canCreateTask: isPMorSocio,
    canSnapshot: isPMorSocio,
    realtimeEnabled: true,
  }

  return (
    <div className="space-y-4">
      <ScopeAlertBanner projectId={projectId} userRole={projectRole} />
      <BoardPageClient
        initialTasks={tasks as unknown as TaskWithAssignee[]}
        config={config}
        userId={user.id}
        userRole={projectRole}
        projectName={project.name}
        members={members.map((m: { user: unknown }) => m.user)}
      />
    </div>
  )
}
