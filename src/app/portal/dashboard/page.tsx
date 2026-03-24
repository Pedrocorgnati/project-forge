// src/app/portal/dashboard/page.tsx
// module-16-clientportal-auth / TASK-3 ST005 (fix module-20-integration/TASK-4)
// Dashboard read-only do cliente: projetos e estimativas
// Rastreabilidade: INT-104, GAP-004

import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge'
import { FolderOpen } from 'lucide-react'
import { EstimateStatus } from '@prisma/client'

export default async function PortalDashboardPage() {
  const user = await getServerUser()

  const clientAccesses = await prisma.clientAccess.findMany({
    where: { clientEmail: user!.email, status: 'ACTIVE' },
    include: {
      project: {
        include: {
          estimates: {
            where: { status: EstimateStatus.READY },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          approvalRequests: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      },
    },
  })

  if (clientAccesses.length === 0) {
    return (
      <EmptyState
        title="Sem projetos ativos"
        description="Você não possui acesso a nenhum projeto no momento."
        icon={<FolderOpen className="h-full w-full" />}
      />
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Seus Projetos</h1>
      {clientAccesses.map((access: { id: string; project: { id: string; name: string; status: string; currency: string; estimates: Array<{ totalMin: unknown; totalMax: unknown }>; approvalRequests: Array<{ id: string; title: string; status: string; slaDeadline: Date }> } }) => {
        const project = access.project
        return (
          <Card key={access.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{project.name}</h2>
                <Badge variant={getStatusBadgeVariant(project.status)}>
                  {project.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {project.estimates[0] && (
                <div className="text-sm text-slate-600 mb-4">
                  <span className="font-medium">Estimativa: </span>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: project.currency })
                    .format(Number(project.estimates[0].totalMin))}
                  {' – '}
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: project.currency })
                    .format(Number(project.estimates[0].totalMax))}
                </div>
              )}
              {project.approvalRequests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Aprovações pendentes</h3>
                  <ul className="space-y-1">
                    {project.approvalRequests.map((req: { id: string; title: string; status: string; slaDeadline: Date }) => (
                      <li key={req.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{req.title}</span>
                        <Badge variant={getStatusBadgeVariant(req.status)} className="text-xs">
                          {req.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
