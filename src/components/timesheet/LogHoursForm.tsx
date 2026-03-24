// ─── LOG HOURS FORM ─────────────────────────────────────────────────────────
// module-14-rentabilia-timesheet / TASK-5
// Formulário para registrar/editar horas com react-hook-form + Zod

'use client'

import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { logTime, editTimeEntry } from '@/actions/rentabilia'
import { Button, Input, Textarea, Select, FormField, toast } from '@/components/ui'
import type { TimesheetEntry } from '@/hooks/use-timesheet'

// ── Schema (client-side subset — server validates fully) ────────────────────

const LogHoursSchema = z.object({
  workDate: z.string().min(1, 'Data é obrigatória'),
  hours: z
    .number({ invalid_type_error: 'Informe um número' })
    .positive('Horas devem ser maior que zero')
    .max(24, 'Máximo 24h por registro')
    .refine((v) => v % 0.25 === 0, 'Múltiplo de 0.25 (15 min)'),
  description: z.string().max(500).optional(),
  taskId: z.string().optional(),
  billable: z.boolean(),
})

type LogHoursValues = z.infer<typeof LogHoursSchema>

// ── Props ───────────────────────────────────────────────────────────────────

interface TaskOption {
  id: string
  title: string
}

interface LogHoursFormProps {
  projectId: string
  userRole: string
  tasks?: TaskOption[]
  editEntry?: TimesheetEntry | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function LogHoursForm({
  projectId,
  userRole,
  tasks = [],
  editEntry,
  onSuccess,
  onCancel,
}: LogHoursFormProps) {
  const isEdit = !!editEntry
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogHoursValues>({
    resolver: zodResolver(LogHoursSchema) as Resolver<LogHoursValues>,
    defaultValues: {
      workDate: editEntry ? format(new Date(editEntry.workDate), 'yyyy-MM-dd') : todayStr,
      hours: editEntry ? Number(editEntry.hours) : undefined,
      description: editEntry?.description ?? '',
      taskId: editEntry?.task?.id ?? '',
      billable: editEntry?.billable ?? true,
    },
  })

  // Reset form when editEntry changes
  useEffect(() => {
    if (editEntry) {
      reset({
        workDate: format(new Date(editEntry.workDate), 'yyyy-MM-dd'),
        hours: Number(editEntry.hours),
        description: editEntry.description ?? '',
        taskId: editEntry.task?.id ?? '',
        billable: editEntry.billable,
      })
    }
  }, [editEntry, reset])

  async function onSubmit(values: LogHoursValues) {
    try {
      if (isEdit && editEntry) {
        // Edit mode — only send changed fields
        const result = await editTimeEntry(editEntry.id, {
          hours: values.hours,
          description: values.description || undefined,
          billable: values.billable,
        })
        if ('error' in result) {
          toast.error(typeof result.error === 'string' ? result.error : 'Erro ao editar registro')
          return
        }
        toast.success('Registro atualizado')
      } else {
        // Create mode
        const result = await logTime({
          projectId,
          workDate: values.workDate,
          hours: values.hours,
          description: values.description || undefined,
          taskId: values.taskId || undefined,
          billable: values.billable,
          role: userRole as 'SOCIO' | 'PM' | 'DEV' | 'CLIENTE',
        })
        if ('error' in result) {
          toast.error(typeof result.error === 'string' ? result.error : 'Erro ao registrar horas')
          return
        }
        toast.success('Horas registradas com sucesso')
      }

      reset()
      onSuccess?.()
    } catch {
      toast.error('Erro de conexão')
    }
  }

  const taskOptions = tasks.map((t) => ({ value: t.id, label: t.title }))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Data" required error={errors.workDate?.message} htmlFor="workDate">
          <Input
            id="workDate"
            type="date"
            max={todayStr}
            disabled={isEdit}
            error={errors.workDate?.message}
            {...register('workDate')}
          />
        </FormField>

        <FormField label="Horas" required error={errors.hours?.message} htmlFor="hours" helper="Múltiplo de 0.25 (15 min)">
          <Input
            id="hours"
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            placeholder="1.5"
            error={errors.hours?.message}
            {...register('hours', { valueAsNumber: true })}
          />
        </FormField>
      </div>

      <FormField label="Descrição" error={errors.description?.message} htmlFor="description">
        <Textarea
          id="description"
          placeholder="Descreva o que foi feito..."
          maxLength={500}
          error={errors.description?.message}
          {...register('description')}
        />
      </FormField>

      {taskOptions.length > 0 && !isEdit && (
        <FormField label="Task (opcional)" htmlFor="taskId">
          <Select
            id="taskId"
            options={taskOptions}
            placeholder="Selecione uma task..."
            {...register('taskId')}
          />
        </FormField>
      )}

      <FormField htmlFor="billable">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            id="billable"
            type="checkbox"
            className="rounded border-slate-300 text-brand focus:ring-brand h-4 w-4"
            {...register('billable')}
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Faturável</span>
        </label>
      </FormField>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Salvar alterações' : 'Registrar horas'}
        </Button>
      </div>
    </form>
  )
}
