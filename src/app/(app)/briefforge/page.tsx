import { MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'BriefForge' }

export default function BriefForgePage() {
  return (
    <div data-testid="briefforge-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">BriefForge</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Entrevista de briefing assistida por IA
        </p>
      </div>

      <Card variant="default">
        <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Selecione um projeto para iniciar
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <EmptyState
            icon={<MessageSquare size={32} />}
            title="Iniciar Briefing"
            description="Selecione um projeto na seção Projetos e acesse o BriefForge para iniciar a entrevista com IA."
          />
        </CardContent>
      </Card>
    </div>
  )
}
