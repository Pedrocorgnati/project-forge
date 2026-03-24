// src/components/portal/client-registration-flow.tsx
// module-16-clientportal-auth / TASK-3 ST003 (correção pós-auditoria)
// Formulário de criação de conta do cliente com auto-login pós-registro
// Rastreabilidade: INT-104, GAP-003

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { LoadingSpinner } from '@/components/ui/skeleton'
import { ROUTES } from '@/lib/constants/routes'

const RegistrationSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type RegistrationData = z.infer<typeof RegistrationSchema>

interface ClientRegistrationFlowProps {
  token: string
  clientEmail: string
  projectName: string
}

export function ClientRegistrationFlow({
  token, clientEmail, projectName,
}: ClientRegistrationFlowProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegistrationData>({
    resolver: zodResolver(RegistrationSchema),
  })

  const onSubmit = async (data: RegistrationData) => {
    setIsLoading(true)
    try {
      // 1. Cria conta via API (Supabase Auth + Prisma User)
      const res = await fetch(`/api/portal/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, password: data.password }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Erro ao criar conta')
      }

      // 2. Auto-login com as credenciais criadas
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: clientEmail,
        password: data.password,
      })
      if (signInError) throw new Error('Conta criada, mas erro ao fazer login automático')

      toast.success('Conta criada!', { description: `Bem-vindo ao portal de ${projectName}` })
      router.push(ROUTES.PORTAL_CLIENT_DASHBOARD)
    } catch (err) {
      toast.error(
        'Erro ao criar conta',
        { description: err instanceof Error ? err.message : 'Tente novamente' },
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <h2 className="text-lg font-semibold">Crie sua conta</h2>
          <p className="text-sm text-gray-500">
            Email: <strong>{clientEmail}</strong> (não pode ser alterado)
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Seu nome completo</Label>
              <Input id="name" {...register('name')} placeholder="João Silva" disabled={isLoading} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" {...register('password')} disabled={isLoading} />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} disabled={isLoading} />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <LoadingSpinner size="sm" /> : null}
              {isLoading ? 'Criando conta...' : 'Criar conta e acessar portal'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
