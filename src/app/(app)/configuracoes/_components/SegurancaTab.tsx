'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'
import { TIMING } from '@/lib/constants/timing'

const senhaSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatória'),
  newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type SenhaForm = z.infer<typeof senhaSchema>

export function SegurancaTab() {
  const form = useForm<SenhaForm>({
    resolver: zodResolver(senhaSchema),
    mode: 'onBlur',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  async function onSubmit() {
    await new Promise((r) => setTimeout(r, TIMING.FORM_FEEDBACK_MS))
    toast.success('Senha alterada com sucesso!')
    form.reset()
  }

  return (
    <Card data-testid="configuracoes-seguranca-card" variant="default">
      <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Segurança</h2>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Senha atual" htmlFor="senha-atual" required
            error={form.formState.errors.currentPassword?.message}>
            <PasswordInput
              id="senha-atual"
              placeholder="••••••••"
              error={form.formState.errors.currentPassword?.message}
              {...form.register('currentPassword')}
            />
          </FormField>

          <FormField label="Nova senha" htmlFor="senha-nova" required
            error={form.formState.errors.newPassword?.message}>
            <PasswordInput
              id="senha-nova"
              placeholder="Mínimo 8 caracteres"
              error={form.formState.errors.newPassword?.message}
              {...form.register('newPassword')}
            />
          </FormField>

          <FormField label="Confirmar nova senha" htmlFor="senha-confirmar" required
            error={form.formState.errors.confirmPassword?.message}>
            <PasswordInput
              id="senha-confirmar"
              placeholder="Repita a nova senha"
              error={form.formState.errors.confirmPassword?.message}
              {...form.register('confirmPassword')}
            />
          </FormField>

          <div className="flex justify-end">
            <Button type="submit" loading={form.formState.isSubmitting}>
              Alterar senha
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
