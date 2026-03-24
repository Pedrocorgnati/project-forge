import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { BarChart2, FolderOpen, TrendingUp, Users } from 'lucide-react'
import { getServerUser } from '@/lib/auth/get-user'
import { prisma } from '@/lib/db'
import { ROUTES } from '@/lib/constants/routes'
import { formatCurrency } from '@/lib/utils/format'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

interface RecentProject {
  id: string
  name: string
  status: string
  updatedAt: Date
  _count: { tasks: number }
}

async function getDashboardStats(userId: string, organizationId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [activeProjectsCount, monthlyHours, avgMargin, activeClientsCount, recentProjects] =
    await Promise.all([
      prisma.project.count({
        where: { organizationId, members: { some: { userId } }, status: 'ACTIVE' },
      }),
      prisma.timeEntry.aggregate({
        where: {
          project: { organizationId },
          workDate: { gte: startOfMonth },
        },
        _sum: { hours: true },
      }),
      prisma.profitReport.aggregate({
        where: {
          project: { organizationId },
          period: 'MONTHLY',
        },
        _avg: { marginPct: true },
      }),
      prisma.projectMember.count({
        where: {
          project: { organizationId, status: 'ACTIVE' },
          user: { role: 'CLIENTE' },
        },
      }),
      prisma.project.findMany({
        where: { organizationId, members: { some: { userId } } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
          _count: { select: { tasks: true } },
        },
      }),
    ])

  return {
    activeProjectsCount,
    monthlyHours: monthlyHours._sum.hours ?? 0,
    avgMarginPct: avgMargin._avg.marginPct ?? null,
    activeClientsCount,
    recentProjects: recentProjects as RecentProject[],
  }
}

async function DashboardContent() {
  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)

  const stats = await getDashboardStats(user.id, user.organizationId)

  const statCards = [
    { label: 'Projetos ativos', value: String(stats.activeProjectsCount), icon: FolderOpen, color: 'text-brand' },
    { label: 'Horas este mês', value: `${stats.monthlyHours.toFixed(0)}h`, icon: BarChart2, color: 'text-info' },
    {
      label: 'Margem média',
      value: stats.avgMarginPct !== null ? `${stats.avgMarginPct.toFixed(1)}%` : '—',
      icon: TrendingUp,
      color: 'text-success',
    },
    { label: 'Clientes ativos', value: String(stats.activeClientsCount), icon: Users, color: 'text-info' },
  ]

  return (
    <>
      <div data-testid="dashboard-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const slug = stat.label.toLowerCase().replace(/\s+/g, '-')
          return (
            <Card key={stat.label} data-testid={`dashboard-stats-card-${slug}`} variant="default">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.label}</span>
                  <Icon size={18} className={stat.color} aria-hidden="true" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card data-testid="dashboard-recent-projects" variant="default">
        <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Projetos recentes</h2>
            <Badge variant="neutral">{stats.recentProjects.length} projetos</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentProjects.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={32} />}
              title="Nenhum projeto ainda"
              description="Acesse a seção Projetos para criar seu primeiro projeto."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.recentProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={ROUTES.PROJECT(project.id)}
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate" title={project.name}>
                      {project.name}
                    </span>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-xs text-muted-foreground">{project._count.tasks} tasks</span>
                      <Badge variant={project.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {project.status === 'ACTIVE' ? 'Ativo' : project.status}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} variant="default">
            <CardContent className="p-5 space-y-3">
              <Skeleton variant="text" className="w-1/2" />
              <Skeleton variant="text" className="w-1/3 h-8" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card variant="default">
        <CardContent className="p-6 space-y-3">
          <Skeleton variant="text" className="w-full" />
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2" />
        </CardContent>
      </Card>
    </>
  )
}

export default function DashboardPage() {
  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Visão geral da sua operação</p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
