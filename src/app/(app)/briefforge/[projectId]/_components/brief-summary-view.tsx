'use client'

import { useRouter } from 'next/navigation'
import { Bot, User, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils/format'
import type { Brief, BriefQuestion } from '@/types/briefforge'

interface BriefSummaryViewProps {
  brief: Brief
  projectId: string
}

export function BriefSummaryView({ brief, projectId }: BriefSummaryViewProps) {
  const router = useRouter()
  // Buscar última sessão COMPLETED
  const completedSession = brief.sessions?.find((s) => s.status === 'COMPLETED')
  const questions = completedSession?.questions
    ? [...completedSession.questions].sort((a, b) => a.order - b.order)
    : []

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={32} />}
        title="Nenhuma resposta encontrada"
        description="O briefing foi marcado como concluído, mas não foram encontradas perguntas e respostas."
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header com metadata */}
      <Card variant="default">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Resumo do Briefing
              </h2>
              {completedSession?.completedAt && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Concluído em {formatDateTime(completedSession.completedAt)}
                </p>
              )}
            </div>
            <Badge variant="success" dot>
              Concluído
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Q&A Cards */}
      <div className="space-y-3">
        {questions.map((q: BriefQuestion) => (
          <Card key={q.id} variant="default" className="overflow-hidden">
            <div role="article" aria-label={`Pergunta ${q.order}: ${q.questionText}`}>
              {/* Pergunta */}
              <CardHeader className="py-3 px-4 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 bg-brand-light dark:bg-brand/20 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    <Bot size={12} className="text-brand dark:text-brand" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Pergunta {q.order}
                    </span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                      {q.questionText}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Resposta */}
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    <User size={12} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {q.answerText ?? 'Sem resposta'}
                    </p>
                    {q.answeredAt && (
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDateTime(q.answeredAt)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      {/* Ação: Gerar PRD (apenas PM/SOCIO) */}
      <PermissionGate role={['SOCIO', 'PM']}>
        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            size="md"
            data-testid="briefforge-generate-prd"
            onClick={() => {
              router.push(`/briefforge/${projectId}/prd`)
            }}
          >
            <FileText size={16} aria-hidden="true" />
            Gerar PRD
          </Button>
        </div>
      </PermissionGate>
    </div>
  )
}
