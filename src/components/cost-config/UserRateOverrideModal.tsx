'use client'

// src/components/cost-config/UserRateOverrideModal.tsx
// module-14-rentabilia-timesheet / TASK-6
// Modal para criar override de tarifa por usuario

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'
import { createCostOverride } from '@/actions/cost-config'

const ROLE_LABELS: Record<string, string> = {
  SOCIO: 'Socio',
  PM: 'Project Manager',
  DEV: 'Desenvolvedor',
  CLIENTE: 'Cliente',
}

const OverrideFormSchema = z.object({
  userId: z.string().min(1, 'Selecione um membro'),
  customRate: z.number({ error: 'Informe um valor numerico' })
    .positive('Tarifa deve ser positiva')
    .max(10000, 'Tarifa maxima: R$ 10.000'),
  reason: z.string()
    .min(10, 'Motivo deve ter pelo menos 10 caracteres')
    .max(300, 'Motivo deve ter no maximo 300 caracteres'),
})

type OverrideFormData = z.infer<typeof OverrideFormSchema>

interface UserRateOverrideModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  role: string
  members: Array<{ id: string; name: string }>
  onSuccess: () => Promise<void>
}

export function UserRateOverrideModal({
  open,
  onOpenChange,
  projectId,
  role,
  members,
  onSuccess,
}: UserRateOverrideModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OverrideFormData>({
    resolver: zodResolver(OverrideFormSchema),
    defaultValues: {
      userId: '',
      customRate: undefined,
      reason: '',
    },
  })

  const handleFormSubmit = async (data: OverrideFormData) => {
    setIsSubmitting(true)
    try {
      const result = await createCostOverride({
        projectId,
        userId: data.userId,
        customRate: data.customRate,
        reason: data.reason,
      })

      if ('error' in result) {
        toast.error(typeof result.error === 'string' ? result.error : 'Erro ao criar override')
        return
      }

      const memberName = members.find((m) => m.id === data.userId)?.name ?? 'membro'
      toast.success(`Override de tarifa criado para ${memberName}`)
      reset()
      onOpenChange(false)
      await onSuccess()
    } catch {
      toast.error('Erro de conexao ao criar override')
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

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: m.name,
  }))

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      variant="form"
      title={`Override de Tarifa — ${ROLE_LABELS[role] ?? role}`}
      description="Defina uma tarifa personalizada para um membro especifico deste perfil."
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
            {isSubmitting ? 'Salvando...' : 'Criar Override'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          label="Membro"
          required
          htmlFor="override-userId"
          error={errors.userId?.message}
        >
          <Select
            id="override-userId"
            options={memberOptions}
            placeholder="Selecione um membro"
            error={errors.userId?.message}
            {...register('userId')}
          />
        </FormField>

        <FormField
          label="Tarifa personalizada (R$)"
          required
          htmlFor="override-customRate"
          error={errors.customRate?.message}
        >
          <Input
            id="override-customRate"
            type="number"
            min={0}
            step={0.01}
            placeholder="Ex: 180.00"
            error={errors.customRate?.message}
            {...register('customRate', { valueAsNumber: true })}
          />
        </FormField>

        <FormField
          label="Motivo"
          required
          htmlFor="override-reason"
          error={errors.reason?.message}
          helper="Minimo 10 caracteres. Ex: Senior com certificacao AWS"
        >
          <Textarea
            id="override-reason"
            placeholder="Explique o motivo do override de tarifa..."
            rows={3}
            error={errors.reason?.message}
            {...register('reason')}
          />
        </FormField>
      </form>
    </Modal>
  )
}
