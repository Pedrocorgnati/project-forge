// src/app/(app)/projects/[id]/timesheet/page.tsx
// Server Component — Timesheet page (module-14-rentabilia-timesheet / TASK-5)

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { TimesheetPageClient } from './timesheet-client'
import { UserRole } from '@prisma/client'

interface TimesheetPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: TimesheetPageProps): Promise<Metadata> {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: { name: true },
  })

  return {
    title: project ? `Timesheet — ${project.name}` : 'Timesheet',
    description: 'Registre e visualize horas trabalhadas no projeto',
  }
}

export default async function TimesheetPage({ params }: TimesheetPageProps) {
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
  const [project, members, tasks] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.task.findMany({
      where: { projectId },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
  ])

  if (!project) {
    redirect('/projects')
  }

  const canSeeAll = projectRole === UserRole.PM || projectRole === UserRole.SOCIO

  return (
    <TimesheetPageClient
      projectId={projectId}
      projectName={project.name}
      userRole={projectRole}
      userId={user.id}
      canSeeAll={canSeeAll}
      members={members.map((m: { user: unknown }) => m.user)}
      tasks={tasks}
    />
  )
}
