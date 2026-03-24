'use client'

// src/components/board/CreateTaskModal.tsx
// Modal para criação de tasks com react-hook-form + Zod (module-9-scopeshield-board)

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { CreateTaskSchema, type CreateTaskInput } from '@/lib/schemas/task'
import type { TaskWithAssignee } from '@/types/board'

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateTaskInput) => Promise<TaskWithAssignee | null>
}

const PRIORITY_OPTIONS = [
  { value: 'P0', label: 'P0 - Crítica' },
  { value: 'P1', label: 'P1 - Alta' },
  { value: 'P2', label: 'P2 - Média' },
  { value: 'P3', label: 'P3 - Baixa' },
]

export function CreateTaskModal({ open, onOpenChange, onSubmit }: CreateTaskModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(CreateTaskSchema) as Resolver<CreateTaskInput>,
    defaultValues: {
      title: '',
      description: '',
      priority: 'P2',
      labels: [],
    },
  })

  const handleFormSubmit = async (data: CreateTaskInput): Promise<void> => {
    const result = await onSubmit(data)
    if (result) {
      reset()
      onOpenChange(false)
    }
    // If result is null, form keeps data so user can retry (Zero Silêncio)
  }

  const handleClose = (isOpen: boolean) => {
    if (!isSubmitting) {
      if (!isOpen) reset()
      onOpenChange(isOpen)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      variant="form"
      title="Nova Tarefa"
      description="Preencha os dados da tarefa. Ela será criada na coluna A Fazer."
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="create-task-form"
            variant="primary"
            loading={isSubmitting}
          >
            {isSubmitting ? 'Criando...' : 'Criar Tarefa'}
          </Button>
        </>
      }
    >
      <form id="create-task-form" onSubmit={handleSubmit(handleFormSubmit as Parameters<typeof handleSubmit>[0])} className="space-y-4">
        <FormField
          label="Título"
          required
          htmlFor="task-title"
          error={errors.title?.message}
        >
          <Input
            id="task-title"
            placeholder="Ex: Implementar tela de login"
            error={errors.title?.message}
            {...register('title')}
          />
        </FormField>

        <FormField
          label="Descrição"
          htmlFor="task-description"
          error={errors.description?.message}
        >
          <Textarea
            id="task-description"
            placeholder="Detalhes da tarefa (opcional)"
            rows={3}
            error={errors.description?.message}
            {...register('description')}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Prioridade"
            htmlFor="task-priority"
            error={errors.priority?.message}
          >
            <Select
              id="task-priority"
              options={PRIORITY_OPTIONS}
              error={errors.priority?.message}
              {...register('priority')}
            />
          </FormField>

          <FormField
            label="Data Limite"
            htmlFor="task-dueDate"
            error={errors.dueDate?.message}
          >
            <Input
              id="task-dueDate"
              type="datetime-local"
              error={errors.dueDate?.message}
              {...register('dueDate')}
            />
          </FormField>
        </div>

        <FormField
          label="Horas Estimadas"
          htmlFor="task-estimatedHours"
          error={errors.estimatedHours?.message}
        >
          <Input
            id="task-estimatedHours"
            type="number"
            min={0}
            step={0.5}
            placeholder="Ex: 4"
            error={errors.estimatedHours?.message}
            {...register('estimatedHours', { valueAsNumber: true })}
          />
        </FormField>
      </form>
    </Modal>
  )
}
