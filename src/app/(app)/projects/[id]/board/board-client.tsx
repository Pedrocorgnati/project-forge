'use client'

// src/app/(app)/projects/[id]/board/board-client.tsx
// Client wrapper integrating KanbanBoard, BoardHeader, Baselines, TaskDetail (module-9-scopeshield-board)

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { BoardHeader } from '@/components/board/BoardHeader'

const TaskDetailSheet = dynamic(
  () => import('@/components/board/TaskDetailSheet').then((m) => ({ default: m.TaskDetailSheet })),
  { loading: () => null, ssr: false },
)
import { BaselinePanel } from '@/components/board/BaselinePanel'
import { BaselineDiff } from '@/components/board/BaselineDiff'
import { CreateBaselineModal } from '@/components/board/CreateBaselineModal'
import { useBaselines } from '@/hooks/use-baselines'
import { useBoardMutations } from '@/hooks/use-board-mutations'
import { useBoardRealtime } from '@/hooks/use-board-realtime'
import type { TaskWithAssignee, KanbanConfig } from '@/types/board'
import type { UpdateTaskInput } from '@/lib/schemas/task'

interface BoardPageClientProps {
  initialTasks: TaskWithAssignee[]
  config: KanbanConfig
  userId: string
  userRole: string
  projectName: string
  members: { id: string; name: string | null; avatarUrl: string | null }[]
}

export function BoardPageClient({
  initialTasks,
  config,
  userId,
  userRole,
  projectName,
  members,
}: BoardPageClientProps) {
  const [tasks, setTasks] = useState<TaskWithAssignee[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null)
  const [baselinePanelOpen, setBaselinePanelOpen] = useState(false)
  const [createBaselineOpen, setCreateBaselineOpen] = useState(false)

  // Baseline hook
  const {
    baselines,
    loading: baselinesLoading,
    selectedBaseline,
    loadingDetail,
    fetchBaselineDetail,
    createBaseline,
  } = useBaselines(config.projectId)

  // Mutations
  const { updateTask } = useBoardMutations({
    projectId: config.projectId,
    tasks,
    setTasks,
  })

  // Realtime
  useBoardRealtime({
    projectId: config.projectId,
    userId,
    enabled: config.realtimeEnabled,
    setTasks,
  })

  const handleTaskClick = useCallback((task: TaskWithAssignee) => {
    setSelectedTask(task)
  }, [])

  const handleTaskSave = useCallback(
    async (taskId: string, data: UpdateTaskInput) => {
      const success = await updateTask(taskId, data as Record<string, unknown>)
      if (success) {
        setSelectedTask((prev) => (prev?.id === taskId ? { ...prev, ...data } as TaskWithAssignee : prev))
      }
      return success
    },
    [updateTask],
  )

  const handleBaselineSelect = useCallback(
    (baselineId: string) => {
      fetchBaselineDetail(baselineId)
    },
    [fetchBaselineDetail],
  )

  return (
    <div className="space-y-4">
      <BoardHeader
        projectName={projectName}
        tasks={tasks}
        activeBaseline={selectedBaseline}
        canSnapshot={config.canSnapshot}
        onOpenBaselinePanel={() => setBaselinePanelOpen(!baselinePanelOpen)}
        onCreateBaseline={() => setCreateBaselineOpen(true)}
      />

      <div className="flex gap-6">
        {/* Main board area */}
        <div className="flex-1 min-w-0">
          <KanbanBoard
            initialTasks={tasks}
            config={config}
            userId={userId}
            onTaskClick={handleTaskClick}
          />
        </div>

        {/* Baseline sidebar */}
        {baselinePanelOpen && (
          <aside className="w-80 shrink-0 space-y-4">
            <BaselinePanel
              baselines={baselines}
              loading={baselinesLoading}
              selectedId={selectedBaseline?.id}
              onSelect={handleBaselineSelect}
              onCreateClick={() => setCreateBaselineOpen(true)}
              canCreate={config.canSnapshot}
            />

            <BaselineDiff
              baseline={selectedBaseline}
              currentTasks={tasks}
              loading={loadingDetail}
            />
          </aside>
        )}
      </div>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null)
        }}
        onSave={handleTaskSave}
        userRole={userRole}
        userId={userId}
        projectMembers={members}
      />

      {/* Create Baseline Modal */}
      {config.canSnapshot && (
        <CreateBaselineModal
          open={createBaselineOpen}
          onOpenChange={setCreateBaselineOpen}
          onSubmit={createBaseline}
        />
      )}
    </div>
  )
}
