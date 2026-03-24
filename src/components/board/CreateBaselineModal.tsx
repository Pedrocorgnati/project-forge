'use client'

// src/components/board/CreateBaselineModal.tsx
// Modal para criar ScopeBaseline (PM/SOCIO) (module-9-scopeshield-board)

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { CreateBaselineSchema, type CreateBaselineInput } from '@/lib/schemas/scope-baseline'

interface CreateBaselineModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, description?: string) => Promise<boolean>
}

export function CreateBaselineModal({ open, onOpenChange, onSubmit }: CreateBaselineModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBaselineInput>({
    resolver: zodResolver(CreateBaselineSchema),
    defaultValues: { name: '', description: '' },
  })

  const handleFormSubmit = async (data: CreateBaselineInput) => {
    setIsSubmitting(true)
    try {
      const success = await onSubmit(data.name, data.description)
      if (success) {
        reset()
        onOpenChange(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(isOpen) => {
        if (!isSubmitting) {
          if (!isOpen) reset()
          onOpenChange(isOpen)
        }
      }}
      variant="form"
      title="Criar Baseline"
      description="Um snapshot imutável do escopo atual será criado. Esta ação não pode ser desfeita."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" loading={isSubmitting} onClick={handleSubmit(handleFormSubmit)}>
            {isSubmitting ? 'Criando...' : 'Criar Baseline'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField label="Nome" required htmlFor="baseline-name" error={errors.name?.message}>
          <Input
            id="baseline-name"
            placeholder="Ex: Sprint 1 — Escopo aprovado pelo cliente"
            error={errors.name?.message}
            {...register('name')}
          />
        </FormField>

        <FormField label="Descrição" htmlFor="baseline-description" error={errors.description?.message}>
          <Textarea
            id="baseline-description"
            placeholder="Observações sobre este baseline (opcional)"
            rows={2}
            error={errors.description?.message}
            {...register('description')}
          />
        </FormField>
      </form>
    </Modal>
  )
}
