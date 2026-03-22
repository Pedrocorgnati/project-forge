import { FolderOpen, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Projetos' }

export default function ProjectsPage() {
  return (
    <div data-testid="projetos-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Projetos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerencie todos os projetos da sua equipe
          </p>
        </div>
        <Button data-testid="projetos-create-button" variant="primary" className="gap-2">
          <Plus size={16} aria-hidden="true" />
          Novo projeto
        </Button>
      </div>

      <Card data-testid="projetos-list" variant="default">
        <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Todos os projetos</h2>
            <Badge variant="neutral">0</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <EmptyState
            icon={<FolderOpen size={32} />}
            title="Nenhum projeto criado"
            description="Clique em 'Novo projeto' para criar seu primeiro projeto e começar a gerenciar sua equipe e clientes."
          />
        </CardContent>
      </Card>
    </div>
  )
}
