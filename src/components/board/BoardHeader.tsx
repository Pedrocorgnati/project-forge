'use client'

// src/components/board/BoardHeader.tsx
// Header do board com título, badge de divergência e ações (module-9-scopeshield-board)

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TaskWithAssignee, ScopeBaselineDetail } from '@/types/board'

interface BoardHeaderProps {
  projectName: string
  tasks: TaskWithAssignee[]
  activeBaseline: ScopeBaselineDetail | null
  canSnapshot: boolean
  onOpenBaselinePanel: () => void
  onCreateBaseline: () => void
}

export function BoardHeader({
  projectName,
  tasks,
  activeBaseline,
  canSnapshot,
  onOpenBaselinePanel,
  onCreateBaseline,
}: BoardHeaderProps) {
  const divergenceCount = useMemo(() => {
    if (!activeBaseline?.snapshot) return 0

    const baselineMap = new Map(
      (activeBaseline.snapshot as TaskWithAssignee[]).map((t) => [t.id, t]),
    )
    const currentMap = new Map(tasks.map((t) => [t.id, t]))

    let count = 0

    // Added (in current, not in baseline)
    for (const task of tasks) {
      if (!baselineMap.has(task.id)) count++
    }

    // Removed (in baseline, not in current)
    for (const task of activeBaseline.snapshot as TaskWithAssignee[]) {
      if (!currentMap.has(task.id)) count++
    }

    // Changed (in both, but different)
    for (const task of tasks) {
      const baselineTask = baselineMap.get(task.id)
      if (!baselineTask) continue
      if (
        baselineTask.status !== task.status ||
        baselineTask.title !== task.title ||
        baselineTask.assigneeId !== task.assigneeId ||
        baselineTask.priority !== task.priority
      ) {
        count++
      }
    }

    return count
  }, [tasks, activeBaseline])

  return (
    <div className="flex items-center justify-between" data-testid="board-header">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Board
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {projectName}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {activeBaseline && divergenceCount > 0 && (
          <button
            type="button"
            onClick={onOpenBaselinePanel}
            className="flex items-center gap-1.5 transition-colors hover:opacity-80"
            aria-label={`${divergenceCount} divergência${divergenceCount > 1 ? 's' : ''} do baseline`}
          >
            <Badge variant="warning" dot>
              {divergenceCount} divergência{divergenceCount > 1 ? 's' : ''}
            </Badge>
          </button>
        )}

        {activeBaseline && divergenceCount === 0 && (
          <Badge variant="success" dot>
            Alinhado ao baseline
          </Badge>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenBaselinePanel}
        >
          Baselines
        </Button>

        {canSnapshot && (
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateBaseline}
          >
            Novo Baseline
          </Button>
        )}
      </div>
    </div>
  )
}
