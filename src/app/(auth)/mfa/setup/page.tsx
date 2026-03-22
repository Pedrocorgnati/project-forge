'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'

const otpSchema = z.object({
  code: z.string().length(6, 'Código deve ter 6 dígitos').regex(/^\d+$/, 'Apenas números'),
})
type OtpFormData = z.infer<typeof otpSchema>

const MOCK_RECOVERY_CODES = [
  'XXXX-XXXX-XXXX',
  'YYYY-YYYY-YYYY',
  'ZZZZ-ZZZZ-ZZZZ',
  'AAAA-BBBB-CCCC',
  'DDDD-EEEE-FFFF',
  'GGGG-HHHH-IIII',
  'JJJJ-KKKK-LLLL',
  'MMMM-NNNN-OOOO',
]

export default function MfaSetupPage() {
  const [step, setStep] = useState<'qr' | 'verify' | 'recovery'>('qr')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  })

  async function handleCopyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  async function onVerify(data: OtpFormData) {
    try {
      // TODO: Implementar backend - Supabase MFA verify TOTP
      void data
      setStep('recovery')
    } catch {
      toast.error('Código inválido. Verifique o app autenticador e tente novamente.')
    }
  }

  async function handleFinish() {
    try {
      // TODO: Implementar backend - marcar MFA como confirmado
      toast.success('Autenticação de dois fatores ativada com sucesso.')
    } catch {
      toast.error('Erro ao finalizar configuração. Tente novamente.')
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-1">
          Configurar autenticação de dois fatores
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Adicione uma camada extra de segurança à sua conta.
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex px-8 pb-6 gap-2">
        {(['qr', 'verify', 'recovery'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              step === s ? 'bg-indigo-600 text-white' :
              (['qr', 'verify', 'recovery'].indexOf(step) > i) ? 'bg-green-500 text-white' :
              'bg-slate-200 dark:bg-slate-700 text-slate-500'
            }`}>
              {i + 1}
            </div>
            {i < 2 && <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />}
          </div>
        ))}
      </div>

      <div className="px-8 pb-8">
        {step === 'qr' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Escaneie o QR code abaixo com seu app autenticador (Google Authenticator, Authy, etc).
            </p>
            {/* @ASSET_PLACEHOLDER
name: mfa-qr-placeholder
type: image
extension: svg
format: 1:1
dimensions: 160x160
description: Placeholder de QR code para configuração de autenticação de dois fatores. Padrão de quadrados pretos e brancos representando um código TOTP.
context: Página de setup MFA, centralizado
style: Técnico, minimalista
mood: Seguro, confiável
colors: black (#000000), white (#ffffff)
elements: Padrão QR code TOTP com finder patterns nos cantos
avoid: Cores, texto, bordas decorativas
*/}
            <div className="flex justify-center">
              <div className="w-40 h-40 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <span className="text-xs text-slate-400">QR Code</span>
              </div>
            </div>
            <Button variant="primary" className="w-full" onClick={() => setStep('verify')}>
              Já escaniei — continuar
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <form onSubmit={handleSubmit(onVerify)} className="space-y-4" noValidate>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Digite o código de 6 dígitos gerado pelo seu app autenticador.
            </p>
            <FormField label="Código de verificação" htmlFor="code" error={errors.code?.message} required>
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="text-center text-xl tracking-widest font-mono"
                error={errors.code?.message}
                {...register('code')}
              />
            </FormField>
            <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>
              Verificar código
            </Button>
          </form>
        )}

        {step === 'recovery' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Guarde estes códigos de recuperação em um local seguro. Cada código pode ser usado apenas uma vez.
            </p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 grid grid-cols-2 gap-2">
              {MOCK_RECOVERY_CODES.map((code) => (
                <button
                  key={code}
                  onClick={() => handleCopyCode(code)}
                  className="flex items-center justify-between font-mono text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {code}
                  {copiedCode === code
                    ? <Check size={12} className="text-green-500" />
                    : <Copy size={12} className="text-slate-400" />
                  }
                </button>
              ))}
            </div>
            <Button variant="primary" className="w-full" onClick={handleFinish}>
              Confirmar e finalizar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
