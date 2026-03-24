'use client'

// src/components/approvals/CreateApprovalModal.tsx
// module-17-clientportal-approvals / TASK-6 ST004
// Modal de criação de pedido de aprovação com validação Zod
// Rastreabilidade: INT-107

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'

// ─── Schema de validação ────────────────────────────────────────────────────

const createApprovalSchema = z.object({
  type: z.enum(['DOCUMENT', 'MILESTONE', 'DELIVERABLE']),
  clientAccessId: z.string().uuid('Selecione um cliente'),
  title: z
    .string()
    .min(3, 'Título deve ter ao menos 3 caracteres')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  description: z
    .string()
    .min(10, 'Descrição deve ter ao menos 10 caracteres')
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres'),
})

type CreateApprovalFormData = z.infer<typeof createApprovalSchema>

// ─── Props ──────────────────────────────────────────────────────────────────

interface ActiveClient {
  id: string
  clientEmail: string
  clientName: string
}

interface CreateApprovalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  activeClients: ActiveClient[]
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function CreateApprovalModal({
  open,
  onOpenChange,
  projectId,
  activeClients,
}: CreateApprovalModalProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateApprovalFormData>({
    resolver: zodResolver(createApprovalSchema),
    defaultValues: {
      type: undefined,
      clientAccessId: '',
      title: '',
      description: '',
    },
  })

  async function onSubmit(data: CreateApprovalFormData) {
    try {
      const res = await fetch(`/api/projects/${projectId}/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const message = body?.message ?? body?.errors?.formErrors?.[0] ?? 'Erro ao criar aprovação'
        toast.error(message)
        return
      }

      toast.success('Aprovação criada com sucesso')
      reset()
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Erro de rede. Tente novamente.')
    }
  }

  const typeOptions = [
    { value: 'DOCUMENT', label: 'Documento' },
    { value: 'MILESTONE', label: 'Milestone' },
    { value: 'DELIVERABLE', label: 'Entregável' },
  ]

  const clientOptions = activeClients.map((c) => ({
    value: c.id,
    label: c.clientName ? `${c.clientName} (${c.clientEmail})` : c.clientEmail,
  }))

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      variant="form"
      title="Nova Aprovação"
      description="Solicite a aprovação de um cliente para um documento, milestone ou entregável."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Tipo"
          required
          htmlFor="approval-type"
          error={errors.type?.message}
        >
          <Select
            id="approval-type"
            options={typeOptions}
            placeholder="Selecione o tipo"
            error={errors.type?.message}
            {...register('type')}
          />
        </FormField>

        <FormField
          label="Cliente"
          required
          htmlFor="approval-client"
          error={errors.clientAccessId?.message}
        >
          <Select
            id="approval-client"
            options={clientOptions}
            placeholder="Selecione o cliente"
            error={errors.clientAccessId?.message}
            {...register('clientAccessId')}
          />
        </FormField>

        <FormField
          label="Título"
          required
          htmlFor="approval-title"
          error={errors.title?.message}
        >
          <Input
            id="approval-title"
            placeholder="Ex.: Aprovação do wireframe v2"
            error={errors.title?.message}
            {...register('title')}
          />
        </FormField>

        <FormField
          label="Descrição"
          required
          htmlFor="approval-description"
          error={errors.description?.message}
        >
          <Textarea
            id="approval-description"
            placeholder="Descreva o que está sendo solicitado para aprovação..."
            rows={4}
            error={errors.description?.message}
            {...register('description')}
          />
        </FormField>

        <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-md px-3 py-2">
          O cliente terá 72 horas para responder. Após esse prazo, a aprovação expira automaticamente.
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            data-testid="submit-approval-button"
          >
            Criar Aprovação
          </Button>
        </div>
      </form>
    </Modal>
  )
}
