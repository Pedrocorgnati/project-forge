'use client'

// src/hooks/use-board-mutations.ts
// Hook de mutação otimista com rollback para o Kanban board (module-9-scopeshield-board)

import { useCallback, useRef } from 'react'
import { toast } from '@/components/ui/toast'
import type { TaskWithAssignee, TaskStatus } from '@/types/board'
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/schemas/task'

interface UseBoardMutationsProps {
  projectId: string
  tasks: TaskWithAssignee[]
  setTasks: React.Dispatch<React.SetStateAction<TaskWithAssignee[]>>
}

export function useBoardMutations({ projectId, tasks, setTasks }: UseBoardMutationsProps) {
  const rollbackRef = useRef<TaskWithAssignee[] | null>(null)

  const moveTask = useCallback(
    async (taskId: string, newStatus: TaskStatus, newPosition: number) => {
      // Save snapshot for rollback
      rollbackRef.current = [...tasks]

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus, position: newPosition, updatedAt: new Date() }
            : t,
        ),
      )

      try {
        const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, position: newPosition } satisfies UpdateTaskInput),
        })

        if (!res.ok) {
          throw new Error(`Erro ${res.status}`)
        }

        rollbackRef.current = null
      } catch {
        // Rollback
        if (rollbackRef.current) {
          setTasks(rollbackRef.current)
          rollbackRef.current = null
        }
        toast.error('Erro ao mover tarefa. Operação revertida.')
      }
    },
    [projectId, tasks, setTasks],
  )

  const createTask = useCallback(
    async (data: CreateTaskInput): Promise<TaskWithAssignee | null> => {
      try {
        const res = await fetch(`/api/projects/${projectId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error?.message ?? `Erro ${res.status}`)
        }

        const newTask: TaskWithAssignee = await res.json()
        setTasks((prev) => [...prev, newTask])
        toast.success('Tarefa criada com sucesso!')
        return newTask
      } catch (err: any) {
        toast.error(err?.message ?? 'Erro ao criar tarefa.')
        return null
      }
    },
    [projectId, setTasks],
  )

  const updateTask = useCallback(
    async (taskId: string, data: UpdateTaskInput): Promise<boolean> => {
      // Optimistic update
      const prevTasks = [...tasks]
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...data, updatedAt: new Date() } : t)) as TaskWithAssignee[],
      )

      try {
        const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!res.ok) {
          throw new Error(`Erro ${res.status}`)
        }

        const updated: TaskWithAssignee = await res.json()
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
        toast.success('Tarefa atualizada!')
        return true
      } catch {
        setTasks(prevTasks)
        toast.error('Erro ao atualizar tarefa.')
        return false
      }
    },
    [projectId, tasks, setTasks],
  )

  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      const prevTasks = [...tasks]
      setTasks((prev) => prev.filter((t) => t.id !== taskId))

      try {
        const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          throw new Error(`Erro ${res.status}`)
        }

        toast.success('Tarefa removida.')
        return true
      } catch {
        setTasks(prevTasks)
        toast.error('Erro ao remover tarefa.')
        return false
      }
    },
    [projectId, tasks, setTasks],
  )

  return { moveTask, createTask, updateTask, deleteTask }
}
