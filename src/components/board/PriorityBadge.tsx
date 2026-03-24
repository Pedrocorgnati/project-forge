// src/components/board/PriorityBadge.tsx
// Badge de prioridade com cores semânticas (module-9-scopeshield-board)

import { cn } from '@/lib/utils'
import { TaskPriority } from '@/types/board'

interface PriorityBadgeProps {
  priority: TaskPriority
  className?: string
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; classes: string }> = {
  [TaskPriority.P0]: {
    label: 'P0',
    classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  [TaskPriority.P1]: {
    label: 'P1',
    classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  [TaskPriority.P2]: {
    label: 'P2',
    classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  [TaskPriority.P3]: {
    label: 'P3',
    classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded',
        config.classes,
        className,
      )}
      aria-label={`Prioridade ${config.label}`}
    >
      {config.label}
    </span>
  )
}
