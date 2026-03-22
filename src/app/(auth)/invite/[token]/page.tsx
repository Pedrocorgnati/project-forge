'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { UserRole } from '@/lib/constants'

const inviteSchema = z.object({
  password: z.string().min(12, 'Mínimo 12 caracteres').regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
    'Deve conter maiúscula, minúscula, número e símbolo'
  ),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
})
type InviteFormData = z.infer<typeof inviteSchema>

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*]/.test(password)) score++

  if (score <= 1) return { score, label: 'Muito fraca', color: 'bg-red-500' }
  if (score === 2) return { score, label: 'Fraca', color: 'bg-orange-500' }
  if (score === 3) return { score, label: 'Razoável', color: 'bg-yellow-500' }
  if (score === 4) return { score, label: 'Forte', color: 'bg-green-400' }
  return { score, label: 'Muito forte', color: 'bg-green-600' }
}

// Simulated invite data — TODO: fetch from backend by token
const STUB_INVITE = {
  name: 'Novo Usuário',
  email: 'usuario@empresa.com',
  role: UserRole.DEV,
  expired: false,
}

export default function InviteAcceptPage() {
  const params = useParams()
  const token = params.token as string
  void token // will be used when backend is implemented

  const [password, setPassword] = useState('')
  const strength = getPasswordStrength(password)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
  })

  if (STUB_INVITE.expired) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-full mx-auto flex items-center justify-center">
          <AlertCircle size={24} className="text-amber-500" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Convite expirado
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Este link de convite expirou ou já foi utilizado. Solicite um novo convite ao administrador.
        </p>
        <Button variant="secondary" className="w-full">
          Voltar ao login
        </Button>
      </div>
    )
  }

  async function onSubmit(data: InviteFormData) {
    try {
      // TODO: Implementar backend - accept invite, set password
      void data
      toast.success('Senha definida com sucesso. Bem-vindo!')
    } catch {
      toast.error('Erro ao aceitar convite. O link pode ter expirado.')
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-8 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle size={18} className="text-green-500" aria-hidden="true" />
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">Convite válido</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-1">
          Bem-vindo, {STUB_INVITE.name}
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">{STUB_INVITE.email}</span>
          <Badge variant="info">{STUB_INVITE.role}</Badge>
        </div>
      </div>

      <div className="px-8 pb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Criar senha" htmlFor="password" error={errors.password?.message} required>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Mínimo 12 caracteres"
              error={errors.password?.message}
              {...register('password', {
                onChange: (e) => setPassword(e.target.value),
              })}
            />
          </FormField>

          {/* Password strength bar */}
          {password.length > 0 && (
            <div className="space-y-1" aria-live="polite">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
                      i <= strength.score ? strength.color : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{strength.label}</p>
            </div>
          )}

          <FormField label="Confirmar senha" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Repita a senha"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </FormField>

          <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>
            Definir senha e entrar
          </Button>
        </form>
      </div>
    </div>
  )
}
