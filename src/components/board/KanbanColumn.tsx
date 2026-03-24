'use client'

// src/components/board/KanbanColumn.tsx
// Coluna droppable com useDroppable do @dnd-kit (module-9-scopeshield-board)

import { memo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Button } from '@/components/ui/button'
import { TaskCard } from './TaskCard'
import type { TaskStatus, TaskWithAssignee } from '@/types/board'
import { COLUMN_CONFIG } from '@/types/board'

interface KanbanColumnProps {
  status: TaskStatus
  tasks: TaskWithAssignee[]
  readOnly?: boolean
  onTaskClick?: (task: TaskWithAssignee) => void
  onCreateTask?: (status: TaskStatus) => void
}

export const KanbanColumn = memo(function KanbanColumn({
  status,
  tasks,
  readOnly = false,
  onTaskClick,
  onCreateTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: 'COLUMN', status },
  })

  const config = COLUMN_CONFIG[status]
  const taskIds = tasks.map((t) => t.id)

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${status}`}
      className={cn(
        'flex flex-col rounded-lg min-w-[280px] w-[280px] flex-shrink-0',
        'lg:min-w-0 lg:w-auto lg:flex-1',
        config.color,
        'dark:bg-slate-900/50',
        isOver && 'ring-2 ring-indigo-400/50',
        'transition-all duration-150',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {config.title}
          </h3>
          <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-medium rounded-full bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
            {tasks.length}
          </span>
        </div>

        {!readOnly && status === 'TODO' && (
          <PermissionGate role={['SOCIO', 'PM']}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCreateTask?.(status)}
              aria-label="Criar nova tarefa"
              className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </PermissionGate>
        )}
      </div>

      {/* Cards */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 px-2 pb-2 space-y-2 min-h-[80px] overflow-y-auto max-h-[calc(100vh-220px)]">
          {tasks.length === 0 ? (
            <EmptyState
              title="Nenhuma tarefa"
              description={`Arraste tarefas para ${config.title}`}
              className="py-6 text-slate-400"
            />
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                readOnly={readOnly}
                onClick={onTaskClick}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
})
