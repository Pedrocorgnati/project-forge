'use client'

import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'
import { TIMING } from '@/lib/constants/timing'

const perfilSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
})

type PerfilForm = z.infer<typeof perfilSchema>

export function PerfilTab() {
  const form = useForm<PerfilForm>({
    resolver: zodResolver(perfilSchema),
    mode: 'onBlur',
    defaultValues: { name: 'Usuário', email: 'usuario@empresa.com' },
  })

  async function onSubmit(data: PerfilForm) {
    await new Promise((r) => setTimeout(r, TIMING.FORM_FEEDBACK_MS))
    toast.success('Perfil atualizado com sucesso!')
    form.reset(data)
  }

  return (
    <Card data-testid="configuracoes-perfil-card" variant="default">
      <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Perfil</h2>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Image
                src="/images/logo-symbol.svg"
                alt="Avatar do usuário"
                width={64}
                height={64}
                className="rounded-full bg-brand-light dark:bg-brand/20 p-3"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-6 h-6 bg-brand rounded-full flex items-center justify-center cursor-pointer hover:bg-brand-hover transition-colors"
                aria-label="Alterar foto de perfil"
              >
                <Camera size={12} className="text-white" aria-hidden="true" />
                <input id="avatar-upload" type="file" accept="image/*" className="sr-only" />
              </label>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-50">
                {form.watch('name')}
              </p>
              <p className="text-sm text-slate-500">{form.watch('email')}</p>
            </div>
          </div>

          <FormField label="Nome completo" htmlFor="perfil-name" required
            error={form.formState.errors.name?.message}>
            <Input
              id="perfil-name"
              placeholder="Seu nome completo"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
          </FormField>

          <FormField label="E-mail" htmlFor="perfil-email" required
            error={form.formState.errors.email?.message}>
            <Input
              id="perfil-email"
              type="email"
              placeholder="seu@email.com"
              error={form.formState.errors.email?.message}
              {...form.register('email')}
            />
          </FormField>

          <div className="flex justify-end">
            <Button type="submit" loading={form.formState.isSubmitting}>
              Salvar alterações
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
