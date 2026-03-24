'use client'

// src/components/board/BaselineDiff.tsx
// Diff visual entre baseline e estado atual do board (module-9-scopeshield-board)

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { TaskWithAssignee, ScopeBaselineDetail } from '@/types/board'

interface BaselineDiffProps {
  baseline: ScopeBaselineDetail | null
  currentTasks: TaskWithAssignee[]
  loading?: boolean
}

interface DiffItem {
  type: 'ADDED' | 'REMOVED' | 'CHANGED'
  task: TaskWithAssignee
  changes?: string[]
}

const DIFF_CONFIG = {
  ADDED: { label: 'Adicionada', variant: 'success' as const, bgClass: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' },
  REMOVED: { label: 'Removida', variant: 'error' as const, bgClass: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' },
  CHANGED: { label: 'Modificada', variant: 'warning' as const, bgClass: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' },
}

export function BaselineDiff({ baseline, currentTasks, loading }: BaselineDiffProps) {
  const diff = useMemo(() => {
    if (!baseline?.snapshot) return []

    const items: DiffItem[] = []
    const baselineMap = new Map(
      (baseline.snapshot as TaskWithAssignee[]).map((t) => [t.id, t]),
    )
    const currentMap = new Map(currentTasks.map((t) => [t.id, t]))

    // Added (in current, not in baseline)
    for (const task of currentTasks) {
      if (!baselineMap.has(task.id)) {
        items.push({ type: 'ADDED', task })
      }
    }

    // Removed (in baseline, not in current)
    for (const task of baseline.snapshot as TaskWithAssignee[]) {
      if (!currentMap.has(task.id)) {
        items.push({ type: 'REMOVED', task })
      }
    }

    // Changed (in both, but different)
    for (const task of currentTasks) {
      const baselineTask = baselineMap.get(task.id)
      if (!baselineTask) continue

      const changes: string[] = []
      if (baselineTask.status !== task.status) changes.push('status')
      if (baselineTask.title !== task.title) changes.push('título')
      if (baselineTask.assigneeId !== task.assigneeId) changes.push('responsável')
      if (baselineTask.priority !== task.priority) changes.push('prioridade')

      if (changes.length > 0) {
        items.push({ type: 'CHANGED', task, changes })
      }
    }

    return items
  }, [baseline, currentTasks])

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-12" />
        ))}
      </div>
    )
  }

  if (!baseline) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">
        Selecione um baseline para ver o diff
      </p>
    )
  }

  if (diff.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          Sem divergências
        </p>
        <p className="text-xs text-slate-400 mt-1">
          O board está alinhado com o baseline selecionado
        </p>
      </div>
    )
  }

  const counts = {
    ADDED: diff.filter((d) => d.type === 'ADDED').length,
    REMOVED: diff.filter((d) => d.type === 'REMOVED').length,
    CHANGED: diff.filter((d) => d.type === 'CHANGED').length,
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex gap-2">
        {counts.ADDED > 0 && <Badge variant="success" dot>{counts.ADDED} adicionada{counts.ADDED > 1 ? 's' : ''}</Badge>}
        {counts.REMOVED > 0 && <Badge variant="error" dot>{counts.REMOVED} removida{counts.REMOVED > 1 ? 's' : ''}</Badge>}
        {counts.CHANGED > 0 && <Badge variant="warning" dot>{counts.CHANGED} modificada{counts.CHANGED > 1 ? 's' : ''}</Badge>}
      </div>

      {/* Items */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {diff.map((item) => {
          const config = DIFF_CONFIG[item.type]
          return (
            <div
              key={`${item.type}-${item.task.id}`}
              className={cn(
                'p-2.5 rounded-md border text-sm',
                config.bgClass,
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                  {item.task.title}
                </span>
                <Badge variant={config.variant} className="text-[10px] shrink-0 ml-2">
                  {config.label}
                </Badge>
              </div>
              {item.changes && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Campos: {item.changes.join(', ')}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
