'use client'

import { Badge } from '@/components/ui/badge'
import type { SessionStatus } from '@/types/briefforge'

interface SessionProgressProps {
  answeredCount: number
  totalExpected: number
  status: SessionStatus | 'NOT_STARTED'
}

export function SessionProgress({ answeredCount, totalExpected, status }: SessionProgressProps) {
  const percentage = totalExpected > 0 ? Math.round((answeredCount / totalExpected) * 100) : 0
  const isCompleted = status === 'COMPLETED'

  return (
    <div
      data-testid="briefforge-progress"
      className="sticky top-0 z-10 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 border-b p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Progresso da entrevista
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            {answeredCount}/{totalExpected}
          </span>
          <Badge variant={isCompleted ? 'success' : 'info'} dot>
            {isCompleted ? 'Concluído' : 'Em andamento'}
          </Badge>
        </div>
      </div>
      <div
        role="progressbar"
        aria-valuenow={answeredCount}
        aria-valuemin={0}
        aria-valuemax={totalExpected}
        aria-label={`Progresso: ${answeredCount} de ${totalExpected} perguntas respondidas`}
        className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-brand rounded-full transition-[width] duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
