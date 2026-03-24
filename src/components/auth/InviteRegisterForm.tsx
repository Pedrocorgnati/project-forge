'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input, PasswordInput } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'
import { API } from '@/lib/constants/api-routes'

const ROLE_LABELS: Record<UserRole, string> = {
  SOCIO: 'Sócio',
  PM: 'Project Manager',
  DEV: 'Desenvolvedor',
  CLIENTE: 'Cliente',
}

const inviteRegisterSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100, 'Máximo 100 caracteres'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[0-9]/, 'Deve conter ao menos 1 número')
    .regex(/[A-Z]/, 'Deve conter ao menos 1 letra maiúscula'),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, { message: 'Aceite os termos para continuar' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof inviteRegisterSchema>

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (password.length >= 12) score++

  if (score <= 1) return { label: 'Fraca', color: 'bg-destructive', width: 'w-1/4' }
  if (score === 2) return { label: 'Média', color: 'bg-yellow-500', width: 'w-2/4' }
  if (score === 3) return { label: 'Forte', color: 'bg-green-400', width: 'w-3/4' }
  return { label: 'Muito forte', color: 'bg-green-600', width: 'w-full' }
}

interface InviteRegisterFormProps {
  token: string
  email: string
  role: UserRole
}

export function InviteRegisterForm({ token, email, role }: InviteRegisterFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [watchedPassword, setWatchedPassword] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(inviteRegisterSchema),
  })

  const passwordValue = watch('password', '')
  const strength = getPasswordStrength(passwordValue || watchedPassword)

  async function onSubmit(data: FormData) {
    setServerError(null)

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        data: { name: data.name, role },
      },
    })

    if (error || !authData.user) {
      setServerError(error?.message ?? 'Erro ao criar conta. Tente novamente.')
      return
    }

    // Sincronizar com banco via API (passa o token do convite)
    const res = await fetch(API.AUTH.INVITE_ACCEPT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        supabaseUserId: authData.user.id,
        name: data.name,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setServerError(body.error?.message ?? 'Erro ao finalizar cadastro.')
      return
    }

    router.push(ROUTES.DASHBOARD)
  }

  const roleLabel = ROLE_LABELS[role] ?? role

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {roleLabel}
            </span>
            <span className="text-sm text-muted-foreground">{email}</span>
          </div>
          <h1 className="text-xl font-semibold">Criar sua conta</h1>
          <p className="text-sm text-muted-foreground">
            Você foi convidado para o ProjectForge. Preencha os dados abaixo para começar.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Nome */}
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Nome completo <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Senha */}
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Senha <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              aria-describedby="password-strength"
              error={errors.password?.message}
              {...register('password', {
                onChange: (e) => setWatchedPassword(e.target.value),
              })}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
            {(passwordValue || watchedPassword) && (
              <div id="password-strength" aria-live="polite" className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div className={`h-1.5 rounded-full transition-all ${strength.color} ${strength.width}`} />
                </div>
                <p className="text-xs text-muted-foreground">Força: {strength.label}</p>
              </div>
            )}
          </div>

          {/* Confirmar senha */}
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmar senha <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Aceite de termos */}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              aria-required="true"
              {...register('acceptTerms')}
              className="mt-0.5 rounded border-input"
            />
            <span>
              Aceito os{' '}
              <a href={ROUTES.TERMS} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                Termos de Uso
              </a>{' '}
              e a{' '}
              <a href={ROUTES.PRIVACY} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                Política de Privacidade
              </a>
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
          )}

          {serverError && (
            <p aria-live="polite" className="text-sm text-destructive">{serverError}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={isSubmitting}
          >
            Criar conta
          </Button>
        </form>
      </div>
    </div>
  )
}
