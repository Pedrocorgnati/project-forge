'use client'

// src/components/board/TaskCard.tsx
// Card arrastável com useSortable do @dnd-kit (module-9-scopeshield-board)

import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { PriorityBadge } from './PriorityBadge'
import { ScopeAlertBadge } from './ScopeAlertBadge'
import type { TaskWithAssignee } from '@/types/board'

interface TaskCardProps {
  task: TaskWithAssignee
  readOnly?: boolean
  onClick?: (task: TaskWithAssignee) => void
  overlay?: boolean
  alertSeverity?: 'LOW' | 'MEDIUM' | 'HIGH'
}

const MAX_VISIBLE_LABELS = 2

export const TaskCard = memo(function TaskCard({ task, readOnly = false, onClick, overlay = false, alertSeverity }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'TASK', task },
    disabled: readOnly,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const extraLabels = task.labels.length > MAX_VISIBLE_LABELS
    ? task.labels.length - MAX_VISIBLE_LABELS
    : 0

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null

  const isOverdue = task.dueDate
    ? new Date(task.dueDate) < new Date() && task.status !== 'DONE'
    : false

  return (
    <div
      ref={setNodeRef}
      style={overlay ? undefined : style}
      data-testid="task-card"
      className={cn(
        'group rounded-lg border bg-white dark:bg-slate-800 p-3 shadow-sm',
        'border-slate-200 dark:border-slate-700',
        'transition-shadow duration-150',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-brand/30',
        overlay && 'shadow-xl ring-2 ring-brand/40 rotate-2',
        !readOnly && 'cursor-grab active:cursor-grabbing',
        readOnly && 'cursor-pointer',
        onClick && 'hover:border-brand/50 dark:hover:border-brand/40',
      )}
      onClick={() => onClick?.(task)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault()
          onClick(task)
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Tarefa: ${task.title}`}
      aria-roledescription={readOnly ? 'cartão de tarefa' : 'cartão arrastável'}
      {...(readOnly ? {} : { ...attributes, ...listeners })}
    >
      {/* Title */}
      <div className="flex items-start gap-1.5 mb-2">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50 line-clamp-2 flex-1">
          {task.title}
        </p>
        {alertSeverity && <ScopeAlertBadge severity={alertSeverity} />}
      </div>

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, MAX_VISIBLE_LABELS).map((label) => (
            <span
              key={label}
              className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            >
              {label}
            </span>
          ))}
          {extraLabels > 0 && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              +{extraLabels}
            </span>
          )}
        </div>
      )}

      {/* Footer: priority, assignee, due date */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          {formattedDueDate && (
            <span
              className={cn(
                'text-[11px]',
                isOverdue
                  ? 'text-red-600 dark:text-red-400 font-medium'
                  : 'text-slate-500 dark:text-slate-400',
              )}
            >
              {formattedDueDate}
            </span>
          )}
        </div>

        {task.assignee && (
          <Avatar
            src={task.assignee.avatarUrl ?? undefined}
            name={task.assignee.name ?? undefined}
            size="sm"
            decorative
            className="w-6 h-6 text-[10px]"
          />
        )}
      </div>
    </div>
  )
})
