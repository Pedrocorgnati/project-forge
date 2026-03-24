'use client'

// src/components/board/TaskEditForm.tsx
// Formulário com RBAC granular por campo (module-9-scopeshield-board)

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { AssigneePicker } from './AssigneePicker'
import { UpdateTaskSchema, type UpdateTaskInput } from '@/lib/schemas/task'
import type { TaskWithAssignee, TaskStatus } from '@/types/board'
import { UserRole } from '@prisma/client'

interface TaskEditFormProps {
  task: TaskWithAssignee
  userRole: string
  userId: string
  isOwnTask: boolean
  onSave: (taskId: string, data: UpdateTaskInput) => Promise<boolean>
  projectMembers?: Array<{ id: string; name: string | null; avatarUrl: string | null }>
}

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'A Fazer' },
  { value: 'IN_PROGRESS', label: 'Em Progresso' },
  { value: 'REVIEW', label: 'Em Revisão' },
  { value: 'DONE', label: 'Concluído' },
]

const PRIORITY_OPTIONS = [
  { value: 'P0', label: 'P0 - Crítica' },
  { value: 'P1', label: 'P1 - Alta' },
  { value: 'P2', label: 'P2 - Média' },
  { value: 'P3', label: 'P3 - Baixa' },
]

export function TaskEditForm({
  task,
  userRole,
  userId,
  isOwnTask,
  onSave,
  projectMembers = [],
}: TaskEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isPMOrSocio = userRole === UserRole.PM || userRole === UserRole.SOCIO
  const isDev = userRole === UserRole.DEV

  // DEV can only edit status + actualHours of own tasks
  const canEditAll = isPMOrSocio
  const canEditStatus = canEditAll || (isDev && isOwnTask)
  const canEditHours = canEditAll || (isDev && isOwnTask)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdateTaskInput>({
    resolver: zodResolver(UpdateTaskSchema),
    defaultValues: {
      title: task.title,
      description: task.description ?? '',
      status: task.status as UpdateTaskInput['status'],
      priority: task.priority as UpdateTaskInput['priority'],
      actualHours: task.actualHours,
      estimatedHours: task.estimatedHours ?? undefined,
      assigneeId: task.assigneeId ?? undefined,
    },
  })

  const handleFormSubmit = async (data: UpdateTaskInput) => {
    setIsSubmitting(true)
    try {
      // Only send fields the user is allowed to edit
      const allowed: UpdateTaskInput = {}
      if (canEditAll) {
        Object.assign(allowed, data)
      } else if (isDev && isOwnTask) {
        if (data.status) allowed.status = data.status
        if (data.actualHours !== undefined) allowed.actualHours = data.actualHours
      }
      await onSave(task.id, allowed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
      {/* Title — PM/SOCIO only */}
      <FormField label="Título" htmlFor="edit-title" error={errors.title?.message}>
        <Input
          id="edit-title"
          disabled={!canEditAll}
          error={errors.title?.message}
          {...register('title')}
        />
      </FormField>

      {/* Status — PM/SOCIO + DEV own task */}
      <FormField label="Status" htmlFor="edit-status" error={errors.status?.message}>
        <Select
          id="edit-status"
          options={STATUS_OPTIONS}
          disabled={!canEditStatus}
          error={errors.status?.message}
          {...register('status')}
        />
      </FormField>

      {/* Priority — PM/SOCIO only */}
      <FormField label="Prioridade" htmlFor="edit-priority" error={errors.priority?.message}>
        <Select
          id="edit-priority"
          options={PRIORITY_OPTIONS}
          disabled={!canEditAll}
          error={errors.priority?.message}
          {...register('priority')}
        />
      </FormField>

      {/* Actual Hours — PM/SOCIO + DEV own task */}
      <FormField label="Horas Reais" htmlFor="edit-actualHours" error={errors.actualHours?.message}>
        <Input
          id="edit-actualHours"
          type="number"
          min={0}
          step={0.5}
          disabled={!canEditHours}
          error={errors.actualHours?.message}
          {...register('actualHours', { valueAsNumber: true })}
        />
      </FormField>

      {/* Assignee — PM/SOCIO only (DEV can self-assign handled in picker) */}
      {canEditAll && (
        <FormField label="Responsável" htmlFor="edit-assignee">
          <AssigneePicker
            members={projectMembers}
            selectedId={watch('assigneeId') ?? null}
            onChange={(id) => setValue('assigneeId', id, { shouldDirty: true })}
            userRole={userRole}
            userId={userId}
          />
        </FormField>
      )}

      {/* Description — PM/SOCIO only */}
      <FormField label="Descrição" htmlFor="edit-description" error={errors.description?.message}>
        <Textarea
          id="edit-description"
          rows={3}
          disabled={!canEditAll}
          error={errors.description?.message}
          {...register('description')}
        />
      </FormField>

      <Button
        type="submit"
        variant="primary"
        size="sm"
        loading={isSubmitting}
        disabled={!isDirty || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </form>
  )
}
