'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Github } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input, PasswordInput } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type LoginFormData = z.infer<typeof loginSchema>

type Tab = 'interno' | 'cliente'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>('interno')
  const [isLoadingGithub, setIsLoadingGithub] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  async function handleGithubLogin() {
    setIsLoadingGithub(true)
    try {
      // TODO: Implementar backend - Supabase OAuth GitHub
      throw new Error('Not implemented - run /auto-flow execute')
    } catch {
      toast.error('Falha ao conectar com GitHub. Tente novamente.')
    } finally {
      setIsLoadingGithub(false)
    }
  }

  async function onSubmit(data: LoginFormData) {
    setAuthError(null)
    try {
      // TODO: Implementar backend - Supabase signInWithPassword
      void data
      throw new Error('Not implemented - run /auto-flow execute')
    } catch {
      setAuthError('E-mail ou senha incorretos. Verifique seus dados e tente novamente.')
    }
  }

  return (
    <div data-testid="login-container" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 text-center">
        {/* @ASSET_PLACEHOLDER
name: logo-symbol
type: image
extension: svg
format: 1:1
dimensions: 40x40
description: Logo símbolo do ProjectForge em formato vetorial. Forma geométrica abstrata representando fluxo de trabalho e integração de módulos de gestão de projetos.
context: Tela de login, centralizado acima do título
style: Minimalista, linhas finas, monocromático
mood: Profissional, moderno, confiável
colors: primary (#6366f1), background (#ffffff)
elements: Forma geométrica abstrata com iniciais PF estilizadas
avoid: Gradientes, sombras complexas, texto descritivo
*/}
        <div className="w-10 h-10 bg-brand rounded-xl mx-auto mb-4 flex items-center justify-center">
          <span className="text-white font-bold text-sm">PF</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Entrar no ProjectForge
        </h1>
      </div>

      {/* Tabs */}
      <div data-testid="login-tabs" className="flex border-b border-slate-200 dark:border-slate-700 px-8">
        {(['interno', 'cliente'] as Tab[]).map((tab) => (
          <button
            key={tab}
            data-testid={`login-tab-${tab}`}
            onClick={() => { setActiveTab(tab); setAuthError(null) }}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'text-brand border-brand'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {tab === 'interno' ? 'Acesso Interno' : 'Portal do Cliente'}
          </button>
        ))}
      </div>

      <div className="px-8 py-6 space-y-4">
        {/* Error banner */}
        {authError && (
          <div
            role="alert"
            className="flex items-start gap-2 p-3 rounded-lg bg-error/10 border border-error/30 text-sm text-error"
          >
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>{authError}</span>
          </div>
        )}

        {/* GitHub OAuth — only for internal */}
        {activeTab === 'interno' && (
          <>
            <Button
              data-testid="login-github-button"
              variant="secondary"
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white dark:text-slate-50 border-slate-900 dark:border-slate-700"
              onClick={handleGithubLogin}
              loading={isLoadingGithub}
              aria-label="Entrar com GitHub"
            >
              <Github size={18} aria-hidden="true" />
              Entrar com GitHub
            </Button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400 dark:text-slate-500">ou</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
          </>
        )}

        {/* Email/password form */}
        <form data-testid="form-login" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            label="E-mail"
            htmlFor="email"
            error={errors.email?.message}
            required
          >
            <Input
              data-testid="form-login-email-input"
              id="email"
              type="email"
              autoComplete="email"
              placeholder={activeTab === 'interno' ? 'seu@email.com' : 'email@empresa.com'}
              error={errors.email?.message}
              {...register('email')}
            />
          </FormField>

          <FormField
            label="Senha"
            htmlFor="password"
            error={errors.password?.message}
            required
          >
            <PasswordInput
              data-testid="form-login-password-input"
              id="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
          </FormField>

          {activeTab === 'interno' && (
            <div className="text-right">
              <Link
                href={ROUTES.FORGOT_PASSWORD}
                className="text-xs text-brand hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>
          )}

          <Button
            data-testid="form-login-submit-button"
            type="submit"
            variant="primary"
            className="w-full"
            loading={isSubmitting}
          >
            Entrar
          </Button>
        </form>
      </div>
    </div>
  )
}
