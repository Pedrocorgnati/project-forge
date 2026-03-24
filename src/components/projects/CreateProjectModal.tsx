'use client'

// src/components/projects/CreateProjectModal.tsx
// module-20-integration — fix TASK-5/ECU
// Modal para criação de projeto — conecta Button "Novo projeto" ao createProject action

import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'
import { createProject } from '@/actions/projects'
import { CreateProjectSchema, type CreateProjectInput } from '@/schemas/project.schema'

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CURRENCY_OPTIONS = [
  { value: 'BRL', label: 'BRL — Real' },
  { value: 'USD', label: 'USD — Dólar' },
  { value: 'EUR', label: 'EUR — Euro' },
]

export function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(CreateProjectSchema) as Resolver<CreateProjectInput>,
    defaultValues: { name: '', description: '', currency: 'BRL' },
  })

  async function onSubmit(data: CreateProjectInput) {
    const result = await createProject(data)
    if ('error' in result) {
      toast.error(typeof result.error === 'string' ? result.error : 'Erro ao criar projeto')
      return
    }
    toast.success('Projeto criado com sucesso!')
    reset()
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      variant="form"
      title="Novo Projeto"
      description="Preencha os dados básicos do projeto."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="create-project-form"
            variant="primary"
            loading={isSubmitting}
          >
            Criar Projeto
          </Button>
        </>
      }
    >
      <form id="create-project-form" onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])} className="space-y-4">
        <FormField label="Nome do projeto" required htmlFor="proj-name" error={errors.name?.message}>
          <Input
            id="proj-name"
            placeholder="Ex: App de gestão financeira"
            error={errors.name?.message}
            {...register('name')}
          />
        </FormField>

        <FormField label="Descrição" htmlFor="proj-description" error={errors.description?.message}>
          <Textarea
            id="proj-description"
            placeholder="Breve descrição do projeto (opcional)"
            rows={3}
            error={errors.description?.message}
            {...register('description')}
          />
        </FormField>

        <FormField label="Moeda" required htmlFor="proj-currency" error={errors.currency?.message}>
          <Select
            id="proj-currency"
            options={CURRENCY_OPTIONS}
            error={errors.currency?.message}
            {...register('currency')}
          />
        </FormField>
      </form>
    </Modal>
  )
}
