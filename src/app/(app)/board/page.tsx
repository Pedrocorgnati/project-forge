import { LayoutGrid } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Board' }

export default function BoardPage() {
  return (
    <div data-testid="board-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Board</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kanban board de tarefas
        </p>
      </div>
      <Card variant="default">
        <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Tarefas do projeto
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <EmptyState
            icon={<LayoutGrid size={32} />}
            title="Nenhum projeto selecionado"
            description="Selecione um projeto na seção Projetos para ver o board de tarefas."
          />
        </CardContent>
      </Card>
    </div>
  )
}
