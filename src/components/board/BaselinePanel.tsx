'use client'

// src/components/board/BaselinePanel.tsx
// Painel lateral listando baselines do projeto (module-9-scopeshield-board)

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import type { ScopeBaselineSummary } from '@/types/board'

interface BaselinePanelProps {
  baselines: ScopeBaselineSummary[]
  loading: boolean
  selectedId?: string | null
  onSelect: (baselineId: string) => void
  onCreateClick: () => void
  canCreate: boolean
}

export function BaselinePanel({
  baselines,
  loading,
  selectedId,
  onSelect,
  onCreateClick,
  canCreate,
}: BaselinePanelProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton variant="custom" className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-16" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Baselines
        </h3>
        {canCreate && (
          <Button variant="outline" size="sm" onClick={onCreateClick}>
            Novo Baseline
          </Button>
        )}
      </div>

      {baselines.length === 0 ? (
        <EmptyState
          title="Nenhum baseline"
          description="Crie um baseline para registrar o escopo aprovado."
          className="py-6"
        />
      ) : (
        <div className="space-y-2">
          {baselines.map((baseline) => (
            <button
              key={baseline.id}
              type="button"
              onClick={() => onSelect(baseline.id)}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-colors',
                selectedId === baseline.id
                  ? 'border-brand bg-brand-light dark:border-brand dark:bg-brand/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
              )}
            >
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {baseline.name}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{baseline.taskCount} tarefas</span>
                <span>
                  {new Date(baseline.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {baseline.description && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{baseline.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
