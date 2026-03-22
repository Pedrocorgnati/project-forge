'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'

const verifySchema = z.object({
  code: z.string().length(6, 'Código deve ter 6 dígitos').regex(/^\d+$/, 'Apenas números'),
})
type VerifyFormData = z.infer<typeof verifySchema>

const ERROR_MESSAGES: Record<number, string> = {
  4: 'Código inválido. Você tem 4 tentativas restantes.',
  3: 'Código inválido. Você tem 3 tentativas restantes.',
  2: 'Código inválido. Você tem 2 tentativas restantes.',
  1: 'Código inválido. Última tentativa antes do bloqueio.',
  0: 'Conta bloqueada por 30 minutos após múltiplas tentativas incorretas.',
}

export default function MfaVerifyPage() {
  const [attemptsLeft, setAttemptsLeft] = useState(5)
  const [useRecovery, setUseRecovery] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
  })

  async function onSubmit(data: VerifyFormData) {
    try {
      // TODO: Implementar backend - Supabase MFA challenge verify
      void data
      throw new Error('Not implemented - run /auto-flow execute')
    } catch {
      const newAttempts = attemptsLeft - 1
      setAttemptsLeft(newAttempts)
      reset()
      if (newAttempts <= 0) {
        toast.error(ERROR_MESSAGES[0])
      } else {
        toast.error(ERROR_MESSAGES[newAttempts] || 'Código inválido.')
      }
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-8 pt-8 pb-6 text-center">
        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-2xl" aria-hidden="true">🔐</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-1">
          Verificação em dois fatores
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {useRecovery
            ? 'Digite um dos seus códigos de recuperação.'
            : 'Digite o código do seu app autenticador.'}
        </p>
      </div>

      <div className="px-8 pb-8">
        {attemptsLeft <= 0 ? (
          <div role="alert" className="text-center space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              {ERROR_MESSAGES[0]}
            </p>
            <Button variant="secondary" className="w-full" onClick={() => window.location.reload()}>
              Voltar ao login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              label={useRecovery ? 'Código de recuperação' : 'Código de verificação'}
              htmlFor="code"
              error={errors.code?.message}
              required
            >
              <Input
                id="code"
                inputMode={useRecovery ? 'text' : 'numeric'}
                maxLength={useRecovery ? 15 : 6}
                placeholder={useRecovery ? 'XXXX-XXXX-XXXX' : '000000'}
                className={!useRecovery ? 'text-center text-xl tracking-widest font-mono' : 'font-mono'}
                error={errors.code?.message}
                {...register('code')}
              />
            </FormField>

            <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>
              Verificar
            </Button>

            <button
              type="button"
              onClick={() => { setUseRecovery((v) => !v); }}
              className="w-full text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {useRecovery ? 'Usar código do autenticador' : 'Usar código de recuperação'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
