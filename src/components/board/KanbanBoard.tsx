'use client'

// src/components/board/KanbanBoard.tsx
// Componente orquestrador do Kanban com DndContext (module-9-scopeshield-board)

import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import dynamic from 'next/dynamic'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
const CreateTaskModal = dynamic(() => import('./CreateTaskModal').then((m) => ({ default: m.CreateTaskModal })), {
  loading: () => null,
  ssr: false,
})
import { useBoardMutations } from '@/hooks/use-board-mutations'
import { useBoardRealtime } from '@/hooks/use-board-realtime'
import { TaskStatus, COLUMN_CONFIG, type TaskWithAssignee, type KanbanConfig } from '@/types/board'

interface KanbanBoardProps {
  initialTasks: TaskWithAssignee[]
  config: KanbanConfig
  userId: string
  onTaskClick?: (task: TaskWithAssignee) => void
}

const COLUMN_ORDER: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.DONE,
]

export function KanbanBoard({ initialTasks, config, userId, onTaskClick }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskWithAssignee[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Hooks
  const { moveTask, createTask } = useBoardMutations({
    projectId: config.projectId,
    tasks,
    setTasks,
  })

  useBoardRealtime({
    projectId: config.projectId,
    userId,
    enabled: config.realtimeEnabled,
    setTasks,
  })

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Group tasks by status
  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, TaskWithAssignee[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.REVIEW]: [],
      [TaskStatus.DONE]: [],
    }

    for (const task of tasks) {
      const status = task.status as TaskStatus
      if (grouped[status]) {
        grouped[status].push(task)
      }
    }

    // Sort by position within each column
    for (const status of COLUMN_ORDER) {
      grouped[status].sort((a, b) => a.position - b.position)
    }

    return grouped
  }, [tasks])

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskData = event.active.data.current
    if (taskData?.type === 'TASK' && taskData.task) {
      setActiveTask(taskData.task as TaskWithAssignee)
    }
  }, [])

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback handled by useDroppable isOver
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null)

      const { active, over } = event
      if (!over) return

      const taskId = active.id as string
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      // Determine target status
      let targetStatus: TaskStatus

      if (over.data.current?.type === 'COLUMN') {
        targetStatus = over.data.current.status as TaskStatus
      } else {
        // Dropped over another task — find its status
        const overTask = tasks.find((t) => t.id === over.id)
        if (!overTask) return
        targetStatus = overTask.status as TaskStatus
      }

      // No change
      if (task.status === targetStatus && active.id === over.id) return

      // Calculate new position
      const targetTasks = columns[targetStatus].filter((t) => t.id !== taskId)
      const overIndex = over.data.current?.type === 'TASK'
        ? targetTasks.findIndex((t) => t.id === over.id)
        : targetTasks.length

      const newPosition = overIndex >= 0 ? overIndex : targetTasks.length

      moveTask(taskId, targetStatus, newPosition)
    },
    [tasks, columns, moveTask],
  )

  const handleDragCancel = useCallback(() => {
    setActiveTask(null)
  }, [])

  const handleTaskClick = useCallback((task: TaskWithAssignee) => {
    onTaskClick?.(task)
  }, [onTaskClick])

  const handleCreateModalOpen = useCallback(() => {
    setCreateModalOpen(true)
  }, [])

  return (
    <div data-testid="kanban-board">
      <DndContext
        sensors={config.canEdit ? sensors : undefined}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 lg:overflow-x-visible">
          {COLUMN_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columns[status]}
              readOnly={!config.canEdit}
              onTaskClick={handleTaskClick}
              onCreateTask={handleCreateModalOpen}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="w-[280px]">
              <TaskCard task={activeTask} overlay />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {config.canCreateTask && (
        <CreateTaskModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSubmit={createTask}
        />
      )}
    </div>
  )
}
