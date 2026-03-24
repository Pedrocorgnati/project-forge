'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/constants'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), mode: 'onBlur' })

  async function onSubmit(data: FormData) {
    try {
      // RESOLVED: DEBT-001
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      })
      if (error) throw error
      setSent(true)
    } catch {
      toast.error('Não foi possível enviar o e-mail. Tente novamente.')
    }
  }

  if (sent) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-8 py-10 text-center space-y-4">
        <div className="w-10 h-10 bg-success/10 rounded-full mx-auto flex items-center justify-center">
          <span className="text-success text-lg">✓</span>
        </div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          E-mail enviado
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
        </p>
        <Link
          href={ROUTES.LOGIN}
          className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <div data-testid="recuperar-senha-container" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Recuperar senha
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Informe seu e-mail para receber o link de redefinição.
        </p>
      </div>

      <div className="px-8 pb-8 space-y-4">
        <form data-testid="form-recuperar-senha" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            label="E-mail"
            htmlFor="email"
            error={errors.email?.message}
            required
          >
            <Input
              data-testid="form-recuperar-senha-email-input"
              id="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </FormField>

          <Button
            data-testid="form-recuperar-senha-submit-button"
            type="submit"
            variant="primary"
            className="w-full"
            loading={isSubmitting}
          >
            Enviar link de recuperação
          </Button>
        </form>

        <Link
          href={ROUTES.LOGIN}
          className="flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Voltar para o login
        </Link>
      </div>
    </div>
  )
}
