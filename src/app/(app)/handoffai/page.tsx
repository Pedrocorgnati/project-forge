import { Bot } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'HandoffAI' }

export default function HandoffAIPage() {
  return (
    <div data-testid="handoffai-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">HandoffAI</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Documentação de handoff gerada por IA
        </p>
      </div>
      <Card variant="default">
        <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Documentos de handoff
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <EmptyState
            icon={<Bot size={32} />}
            title="Nenhum handoff gerado"
            description="Selecione um projeto na seção Projetos para gerar a documentação de handoff assistida por IA."
          />
        </CardContent>
      </Card>
    </div>
  )
}
