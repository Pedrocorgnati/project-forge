import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { BarChart2, FolderOpen, TrendingUp, Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

const statCards = [
  { label: 'Projetos ativos', value: '—', icon: FolderOpen, color: 'text-brand' },
  { label: 'Horas este mês', value: '—', icon: BarChart2, color: 'text-info' },
  { label: 'Margem média', value: '—', icon: TrendingUp, color: 'text-success' },
  { label: 'Clientes ativos', value: '—', icon: Users, color: 'text-purple-500' },
]

export default function DashboardPage() {
  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Visão geral da sua operação
        </p>
      </div>

      {/* Stat cards */}
      <div data-testid="dashboard-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const slug = stat.label.toLowerCase().replace(/\s+/g, '-')
          return (
            <Card key={stat.label} data-testid={`dashboard-stats-card-${slug}`} variant="default">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {stat.label}
                  </span>
                  <Icon size={18} className={stat.color} aria-hidden="true" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent projects */}
      <Card data-testid="dashboard-recent-projects" variant="default">
        <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Projetos recentes
            </h2>
            <Badge variant="neutral">0 projetos</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <EmptyState
            icon={<FolderOpen size={32} />}
            title="Nenhum projeto ainda"
            description="Acesse a seção Projetos para criar seu primeiro projeto."
          />
        </CardContent>
      </Card>

      {/* Alerts skeleton placeholder */}
      <Card data-testid="dashboard-alerts" variant="default">
        <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Alertas de escopo
          </h2>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <Skeleton variant="text" className="w-full" />
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2" />
        </CardContent>
      </Card>
    </div>
  )
}
