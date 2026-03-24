'use client'

// src/components/board/TaskDetailSheet.tsx
// Slide-over lateral com detalhes completos da task (module-9-scopeshield-board)

import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { PriorityBadge } from './PriorityBadge'
import { TaskEditForm } from './TaskEditForm'
import type { TaskWithAssignee } from '@/types/board'
import { COLUMN_CONFIG } from '@/types/board'
import type { UpdateTaskInput } from '@/lib/schemas/task'

interface TaskDetailSheetProps {
  task: TaskWithAssignee | null
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole: string
  userId: string
  onSave: (taskId: string, data: UpdateTaskInput) => Promise<boolean>
  projectMembers?: Array<{ id: string; name: string | null; avatarUrl: string | null }>
}

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  userRole,
  userId,
  onSave,
  projectMembers = [],
}: TaskDetailSheetProps) {
  if (!task) return null

  const statusConfig = COLUMN_CONFIG[task.status]
  const formattedDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  const canEdit = userRole !== 'CLIENTE'
  const isOwnTask = task.assigneeId === userId

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 bg-black/30 dark:bg-black/50 z-40',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed right-0 top-0 bottom-0 z-50 w-full max-w-md',
            'bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700',
            'shadow-xl overflow-y-auto',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            'duration-200',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-50 line-clamp-1">
              {task.title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Fechar detalhes"
                className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          {/* Detail info */}
          <div className="px-6 py-4 space-y-4">
            {/* Status & Priority */}
            <div className="flex items-center gap-3">
              <Badge variant={task.status === 'DONE' ? 'success' : task.status === 'IN_PROGRESS' ? 'warning' : 'neutral'}>
                {statusConfig.title}
              </Badge>
              <PriorityBadge priority={task.priority} />
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Descrição</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}

            {/* Assignee */}
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Responsável</p>
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar
                    src={task.assignee.avatarUrl ?? undefined}
                    name={task.assignee.name ?? undefined}
                    size="sm"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {task.assignee.name ?? 'Sem nome'}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-400">Não atribuído</span>
              )}
            </div>

            {/* Labels */}
            {task.labels.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Labels</p>
                <div className="flex flex-wrap gap-1">
                  {task.labels.map((label) => (
                    <Badge key={label} variant="neutral">{label}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Dates & Hours */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {formattedDate && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Data Limite</p>
                  <p className="text-slate-700 dark:text-slate-300">{formattedDate}</p>
                </div>
              )}
              {task.estimatedHours != null && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Estimado</p>
                  <p className="text-slate-700 dark:text-slate-300">{task.estimatedHours}h</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Horas Reais</p>
                <p className="text-slate-700 dark:text-slate-300">{task.actualHours}h</p>
              </div>
            </div>
          </div>

          {/* Edit form */}
          {canEdit && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Editar</p>
              <TaskEditForm
                task={task}
                userRole={userRole}
                userId={userId}
                isOwnTask={isOwnTask}
                onSave={onSave}
                projectMembers={projectMembers}
              />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
