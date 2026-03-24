'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Github } from 'lucide-react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'

const githubSyncFormSchema = z.object({
  repoUrl: z
    .string()
    .min(1, 'URL do repositorio e obrigatoria')
    .url('Deve ser uma URL valida')
    .regex(
      /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/,
      'Deve ser uma URL de repositorio GitHub valida (ex: https://github.com/org/repo)',
    ),
  branch: z.string().min(1, 'Branch e obrigatoria'),
  autoSync: z.boolean(),
})

type GitHubSyncFormValues = z.infer<typeof githubSyncFormSchema>

interface GitHubSyncData {
  id: string
  installationId: string
  repoOwner: string
  repoName: string
  syncStatus: string
  lastWebhookAt: string | null
}

interface GitHubSyncConfigProps {
  gitHubSync: GitHubSyncData | null
  isAvailable: boolean
  projectId: string
}

type SyncStatus = 'IDLE' | 'SYNCING' | 'ERROR' | 'NOT_CONFIGURED'

const SYNC_STATUS_CONFIG: Record<SyncStatus, { label: string; variant: BadgeVariant }> = {
  NOT_CONFIGURED: { label: 'Não sincronizado', variant: 'neutral' },
  IDLE: { label: 'Sincronizado', variant: 'success' },
  SYNCING: { label: 'Sincronizando...', variant: 'info' },
  ERROR: { label: 'Erro', variant: 'error' },
}

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function GitHubSyncConfig({
  gitHubSync,
  isAvailable,
  projectId,
}: GitHubSyncConfigProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    gitHubSync ? (gitHubSync.syncStatus as SyncStatus) : 'NOT_CONFIGURED',
  )
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(
    gitHubSync?.lastWebhookAt ?? null,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isConfigured = !!gitHubSync
  const statusConfig = SYNC_STATUS_CONFIG[syncStatus] ?? SYNC_STATUS_CONFIG.NOT_CONFIGURED

  const defaultRepoUrl =
    gitHubSync
      ? `https://github.com/${gitHubSync.repoOwner}/${gitHubSync.repoName}`
      : ''

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<GitHubSyncFormValues>({
    resolver: zodResolver(githubSyncFormSchema),
    mode: 'onChange',
    defaultValues: {
      repoUrl: defaultRepoUrl,
      branch: 'main',
      autoSync: false,
    },
  })

  const autoSyncValue = watch('autoSync')

  async function onSubmit(data: GitHubSyncFormValues) {
    if (!isAvailable || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/rag/github-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: data.repoUrl,
          branch: data.branch,
          autoSync: data.autoSync,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message ?? 'Erro ao configurar sincronizacao.')
      }

      setSyncStatus('SYNCING')
      setLastSyncAt(new Date().toISOString())
      toast.success('Sincronizacao configurada com sucesso.')

      // Simular transicao de SYNCING para IDLE apos alguns segundos
      // Em producao, isso viria do polling
      setTimeout(() => {
        setSyncStatus('IDLE')
      }, 5000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao configurar sincronizacao.'
      setSyncStatus('ERROR')
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldsDisabled = !isAvailable || isSubmitting
  const submitDisabled = !isAvailable || isSubmitting || !isValid

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Sincronizacao GitHub
            </h2>
          </div>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form
          id="github-sync-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FormField
            label="URL do Repositorio"
            required
            htmlFor="repoUrl"
            error={errors.repoUrl?.message}
          >
            <Input
              id="repoUrl"
              placeholder="https://github.com/org/repo"
              disabled={fieldsDisabled}
              error={errors.repoUrl?.message}
              {...register('repoUrl')}
            />
          </FormField>

          <FormField
            label="Branch"
            required
            htmlFor="branch"
            error={errors.branch?.message}
          >
            <Input
              id="branch"
              placeholder="main"
              disabled={fieldsDisabled}
              error={errors.branch?.message}
              {...register('branch')}
            />
          </FormField>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label
                htmlFor="autoSync"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Sincronizacao automatica
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sincroniza automaticamente quando o repositorio e atualizado.
              </p>
            </div>
            <button
              type="button"
              id="autoSync"
              role="switch"
              aria-checked={autoSyncValue}
              disabled={fieldsDisabled}
              onClick={() => {
                const input = document.querySelector<HTMLInputElement>('input[name="autoSync"]')
                if (input) {
                  input.click()
                }
              }}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
                ${fieldsDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${autoSyncValue ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200
                  ${autoSyncValue ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
            <input
              type="checkbox"
              className="sr-only"
              {...register('autoSync')}
            />
          </div>

          {syncStatus === 'IDLE' && lastSyncAt && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ultima sincronizacao: {formatTimestamp(lastSyncAt)}
            </p>
          )}
        </form>
      </CardContent>
      <CardFooter className="border-t-0 pt-0">
        <Button
          type="submit"
          form="github-sync-form"
          variant="primary"
          size="md"
          className="w-full"
          disabled={submitDisabled}
          aria-disabled={submitDisabled ? 'true' : undefined}
          loading={isSubmitting}
          title={!isAvailable ? 'Indisponível: serviço de embeddings offline' : undefined}
        >
          {isConfigured ? 'Atualizar configuração' : 'Configurar e sincronizar'}
        </Button>
      </CardFooter>
    </Card>
  )
}
