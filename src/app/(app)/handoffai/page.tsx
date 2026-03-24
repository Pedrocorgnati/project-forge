import { Bot } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'HandoffAI' }

export default function HandoffAIPage() {
  return (
    <div data-testid="handoffai-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">HandoffAI</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Documentacao de handoff gerada por IA
        </p>
      </div>
      <Card variant="default">
        <CardContent>
          <EmptyState
            icon={<Bot size={32} />}
            title="Acesse o HandoffAI pela página do projeto"
            description="Navegue até um projeto e acesse a aba HandoffAI para indexar documentos e habilitar respostas contextuais com IA."
          />
        </CardContent>
      </Card>
    </div>
  )
}
