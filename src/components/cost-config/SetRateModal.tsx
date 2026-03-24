'use client'

// src/components/cost-config/SetRateModal.tsx
// module-14-rentabilia-timesheet / TASK-6
// Modal para definir tarifa por role via createCostConfig

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'
import { createCostConfig } from '@/actions/cost-config'

const ROLE_LABELS: Record<string, string> = {
  SOCIO: 'Socio',
  PM: 'Project Manager',
  DEV: 'Desenvolvedor',
  CLIENTE: 'Cliente',
}

const SetRateFormSchema = z.object({
  hourlyRate: z.number({ error: 'Informe um valor numerico' })
    .positive('Tarifa deve ser positiva')
    .max(10000, 'Tarifa maxima: R$ 10.000'),
  effectiveFrom: z.string().min(1, 'Data obrigatoria'),
})

type SetRateFormData = z.infer<typeof SetRateFormSchema>

interface SetRateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  role: string
  onSuccess: () => Promise<void>
}

export function SetRateModal({ open, onOpenChange, projectId, role, onSuccess }: SetRateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SetRateFormData>({
    resolver: zodResolver(SetRateFormSchema),
    defaultValues: {
      hourlyRate: undefined,
      effectiveFrom: new Date().toISOString().split('T')[0],
    },
  })

  const handleFormSubmit = async (data: SetRateFormData) => {
    setIsSubmitting(true)
    try {
      const result = await createCostConfig({
        projectId,
        role: role as 'SOCIO' | 'PM' | 'DEV' | 'CLIENTE',
        hourlyRate: data.hourlyRate,
        effectiveFrom: data.effectiveFrom,
      })

      if ('error' in result) {
        toast.error(typeof result.error === 'string' ? result.error : 'Erro ao salvar tarifa')
        return
      }

      toast.success(`Tarifa de ${ROLE_LABELS[role] ?? role} atualizada com sucesso`)
      reset()
      onOpenChange(false)
      await onSuccess()
    } catch {
      toast.error('Erro de conexao ao salvar tarifa')
    } finally {
      setIsSubmitting(false)
    }
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
      title={`Editar Tarifa — ${ROLE_LABELS[role] ?? role}`}
      description="Defina a tarifa horaria para este perfil. A tarifa anterior sera encerrada automaticamente."
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
            variant="primary"
            loading={isSubmitting}
            onClick={handleSubmit(handleFormSubmit)}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Tarifa'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          label="Perfil"
          htmlFor="rate-role"
        >
          <Input
            id="rate-role"
            value={ROLE_LABELS[role] ?? role}
            disabled
          />
        </FormField>

        <FormField
          label="Tarifa por hora (R$)"
          required
          htmlFor="rate-hourlyRate"
          error={errors.hourlyRate?.message}
        >
          <Input
            id="rate-hourlyRate"
            type="number"
            min={0}
            step={0.01}
            placeholder="Ex: 150.00"
            error={errors.hourlyRate?.message}
            {...register('hourlyRate', { valueAsNumber: true })}
          />
        </FormField>

        <FormField
          label="Vigencia a partir de"
          required
          htmlFor="rate-effectiveFrom"
          error={errors.effectiveFrom?.message}
        >
          <Input
            id="rate-effectiveFrom"
            type="date"
            error={errors.effectiveFrom?.message}
            {...register('effectiveFrom')}
          />
        </FormField>
      </form>
    </Modal>
  )
}
