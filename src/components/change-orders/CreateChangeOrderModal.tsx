// ─── CREATE CHANGE ORDER MODAL ────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-2 / ST003
// Rastreabilidade: INT-074

'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(200, 'Máximo 200 caracteres'),
  description: z
    .string()
    .min(10, 'Mínimo 10 caracteres')
    .max(2000, 'Máximo 2000 caracteres'),
  impactHours: z.coerce.number().positive('Deve ser um número positivo'),
  affectedTaskIds: z.array(z.string()).default([]),
})

type FormValues = z.infer<typeof schema>

interface Task {
  id: string
  title: string
  status: string
}

interface CreateChangeOrderModalProps {
  projectId: string
  onClose: () => void
  onCreated: () => void
}

export function CreateChangeOrderModal({
  projectId,
  onClose,
  onCreated,
}: CreateChangeOrderModalProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksError, setTasksError] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { affectedTaskIds: [] },
  })

  const affectedIds = watch('affectedTaskIds') ?? []

  useEffect(() => {
    fetch(`/api/projects/${projectId}/tasks`)
      .then(r => {
        if (!r.ok) throw new Error('Erro ao carregar tasks')
        return r.json()
      })
      .then(setTasks)
      .catch(() => setTasksError(true))
  }, [projectId])

  const toggleTask = (taskId: string) => {
    const current = getValues('affectedTaskIds') ?? []
    if (current.includes(taskId)) {
      setValue('affectedTaskIds', current.filter(id => id !== taskId))
    } else {
      setValue('affectedTaskIds', [...current, taskId])
    }
  }

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/change-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        toast.success('Change Order criada como Rascunho')
        onCreated()
        onClose()
      } else {
        const err = await res.json()
        toast.error(err.error ?? 'Erro ao criar change order')
      }
    } catch {
      toast.error('Erro de conexão. Tente novamente.')
    }
  }

  return (
    <Modal
      open
      onOpenChange={open => !open && onClose()}
      variant="form"
      title="Nova Change Order"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="create-co-form"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Criando...' : 'Criar como Rascunho'}
          </Button>
        </>
      }
    >
      <form
        id="create-co-form"
        onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])}
        className="space-y-4"
        aria-label="Formulário de nova change order"
      >
        <FormField
          label="Título"
          required
          htmlFor="co-title"
          error={errors.title?.message}
        >
          <Input
            id="co-title"
            placeholder="ex: Adicionar módulo de relatórios"
            error={errors.title?.message}
            aria-describedby={errors.title ? 'co-title-error' : undefined}
            {...register('title')}
          />
        </FormField>

        <FormField
          label="Descrição"
          required
          htmlFor="co-description"
          error={errors.description?.message}
        >
          <Textarea
            id="co-description"
            placeholder="Descreva o que mudou, por que e qual o impacto..."
            rows={4}
            error={errors.description?.message}
            aria-describedby={errors.description ? 'co-description-error' : undefined}
            {...register('description')}
          />
        </FormField>

        <FormField
          label="Horas de Impacto"
          required
          htmlFor="co-impact-hours"
          error={errors.impactHours?.message}
          helper="Estimativa de horas adicionais necessárias"
        >
          <Input
            id="co-impact-hours"
            type="number"
            step="0.5"
            min="0.5"
            placeholder="ex: 8"
            error={errors.impactHours?.message}
            {...register('impactHours')}
          />
        </FormField>

        {/* Multi-select de tasks afetadas */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Tasks Afetadas{' '}
            <span className="text-xs text-slate-400 font-normal">(opcional)</span>
          </label>

          {tasksError ? (
            <p className="text-xs text-red-500 p-2 border border-red-200 rounded-md">
              Erro ao carregar tasks. Você pode criar a CO sem selecionar tasks.
            </p>
          ) : (
            <div className="border border-slate-300 dark:border-slate-600 rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-400 p-1">
                  Nenhuma task encontrada no projeto
                </p>
              ) : (
                tasks.map(task => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    aria-pressed={affectedIds.includes(task.id)}
                    className={cn(
                      'w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors',
                      affectedIds.includes(task.id) &&
                        'bg-brand-light dark:bg-brand/10 text-brand-hover dark:text-brand font-medium',
                    )}
                  >
                    <span
                      className={cn(
                        'h-3.5 w-3.5 rounded border flex-shrink-0',
                        affectedIds.includes(task.id)
                          ? 'bg-brand border-brand'
                          : 'border-slate-400',
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate">{task.title}</span>
                    <Badge variant="neutral" className="ml-auto text-xs px-1 py-0">
                      {task.status.replace(/_/g, ' ')}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          )}

          {affectedIds.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              {affectedIds.length} task
              {affectedIds.length > 1 ? 's' : ''} selecionada
              {affectedIds.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </form>
    </Modal>
  )
}
