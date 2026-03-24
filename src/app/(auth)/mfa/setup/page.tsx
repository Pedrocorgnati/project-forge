'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Copy, Check } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

const otpSchema = z.object({
  code: z.string().length(6, 'Código deve ter 6 dígitos').regex(/^\d+$/, 'Apenas números'),
})
type OtpFormData = z.infer<typeof otpSchema>

function generateRecoveryCodes(): string[] {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 8 }, () => {
    const segment = () =>
      Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    return `${segment()}-${segment()}-${segment()}`
  })
}

export default function MfaSetupPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState<'qr' | 'verify' | 'recovery'>('qr')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [manualSecret, setManualSecret] = useState<string>('')
  const [factorId, setFactorId] = useState<string>('')
  const [recoveryCodes] = useState<string[]>(() => generateRecoveryCodes())
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    mode: 'onBlur',
  })

  useEffect(() => {
    async function enrollMfa() {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (error || !data) {
        toast.error('Erro ao iniciar configuração MFA. Tente novamente.')
        return
      }
      setQrCodeUrl(data.totp.qr_code)
      setManualSecret(data.totp.secret)
      setFactorId(data.id)
    }
    enrollMfa()
  }, [])

  async function handleCopyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  async function onVerify(data: OtpFormData) {
    try {
      const supabase = createClient()
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError || !challenge) throw challengeError ?? new Error('Challenge failed')

      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: data.code,
      })
      if (error) throw error

      setStep('recovery')
    } catch {
      toast.error('Código inválido. Verifique o app autenticador e tente novamente.')
    }
  }

  async function handleFinish() {
    try {
      toast.success('Autenticação de dois fatores ativada com sucesso.')
      const destination = user?.role === UserRole.CLIENTE ? ROUTES.PORTAL : ROUTES.DASHBOARD
      router.push(destination)
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
              step === s ? 'bg-brand text-white' :
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
            <div className="flex justify-center">
              {qrCodeUrl ? (
                <Image
                  src={qrCodeUrl}
                  alt="QR code para configuração MFA TOTP"
                  width={160}
                  height={160}
                  className="rounded-lg border border-slate-200 dark:border-slate-700"
                  unoptimized
                />
              ) : (
                <div className="w-40 h-40 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <span className="text-xs text-slate-400">Carregando...</span>
                </div>
              )}
            </div>
            {manualSecret && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ou insira o código manualmente:
                </p>
                <button
                  onClick={() => handleCopyCode(manualSecret)}
                  className="flex items-center gap-2 font-mono text-xs text-slate-700 dark:text-slate-300 hover:text-brand dark:hover:text-brand transition-colors break-all"
                >
                  {manualSecret}
                  {copiedCode === manualSecret
                    ? <Check size={12} className="text-green-500 shrink-0" aria-hidden="true" />
                    : <Copy size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
                  }
                </button>
              </div>
            )}
            <Button variant="primary" className="w-full" onClick={() => setStep('verify')} disabled={!factorId}>
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
              {recoveryCodes.map((code) => (
                <button
                  key={code}
                  onClick={() => handleCopyCode(code)}
                  className="flex items-center justify-between font-mono text-xs text-slate-700 dark:text-slate-300 hover:text-brand dark:hover:text-brand transition-colors"
                >
                  {code}
                  {copiedCode === code
                    ? <Check size={12} className="text-green-500" aria-hidden="true" />
                    : <Copy size={12} className="text-slate-400" aria-hidden="true" />
                  }
                </button>
              ))}
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recoveryConfirmed}
                onChange={(e) => setRecoveryConfirmed(e.target.checked)}
                className="mt-0.5 accent-brand"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Confirmo que salvei os códigos de recuperação em um local seguro.
              </span>
            </label>
            <Button variant="primary" className="w-full" onClick={handleFinish} disabled={!recoveryConfirmed}>
              Confirmar e finalizar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
