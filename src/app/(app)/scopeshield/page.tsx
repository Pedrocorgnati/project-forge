import { Shield } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'ScopeShield' }

export default function ScopeShieldPage() {
  return (
    <div data-testid="scopeshield-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">ScopeShield</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Monitoramento de escopo e desvios em tempo real
        </p>
      </div>

      <Card variant="default">
        <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Board de tarefas
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <EmptyState
            icon={<Shield size={32} />}
            title="Nenhum projeto selecionado"
            description="Selecione um projeto na seção Projetos para visualizar o board Kanban e monitorar o escopo."
          />
        </CardContent>
      </Card>
    </div>
  )
}
