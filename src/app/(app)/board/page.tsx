// src/app/(app)/board/page.tsx
// Board hub — lista projetos do usuário e redireciona para o board do projeto
// Module: module-9-scopeshield-board

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutGrid } from 'lucide-react'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ROUTES } from '@/lib/constants'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Board' }

export default async function BoardPage() {
  const user = await getServerUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    include: {
      project: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { project: { updatedAt: 'desc' } },
  })

  const projects = memberships.map((m: { project: { id: string; name: string; status: string } }) => m.project)

  return (
    <div data-testid="board-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Board</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Selecione um projeto para acessar o Kanban board
        </p>
      </div>

      {projects.length === 0 ? (
        <Card variant="default">
          <CardContent className="p-0">
            <EmptyState
              icon={<LayoutGrid size={32} />}
              title="Nenhum projeto encontrado"
              description="Você não participa de nenhum projeto. Peça ao gestor para adicioná-lo."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: { id: string; name: string; status: string }) => (
            <Link
              key={project.id}
              href={ROUTES.PROJECT_BOARD(project.id)}
              className="block"
            >
              <Card variant="interactive" className="h-full">
                <CardHeader className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <LayoutGrid size={18} className="text-brand shrink-0" />
                    <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {project.name}
                    </h3>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
