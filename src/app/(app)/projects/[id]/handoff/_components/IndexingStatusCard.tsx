'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

type IndexationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED'

interface RagIndexData {
  id: string
  projectId: string
  indexationStatus: IndexationStatus
  totalChunks: number
  lastIndexedAt: string | null
  githubRepoUrl: string | null
  createdAt: string
}

interface DocumentData {
  id: string
  sourceType: string
  sourcePath: string
  createdAt: string
}

interface IndexingStatusCardProps {
  initialRagIndex: RagIndexData | null
  isAvailable: boolean
  projectId: string
  onDataUpdate?: (ragIndex: RagIndexData | null, documents: DocumentData[]) => void
}

const STATUS_CONFIG: Record<IndexationStatus, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Não indexado',
    variant: 'neutral',
    icon: <Clock className="h-3 w-3" aria-hidden="true" />,
  },
  IN_PROGRESS: {
    label: 'Indexando...',
    variant: 'info',
    icon: <Loader2 className="h-3 w-3 animate-spin" aria-label="Carregando" />,
  },
  COMPLETE: {
    label: 'Pronto',
    variant: 'success',
    icon: <CheckCircle className="h-3 w-3" aria-hidden="true" />,
  },
  FAILED: {
    label: 'Erro',
    variant: 'error',
    icon: <XCircle className="h-3 w-3" aria-hidden="true" />,
  },
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

export function IndexingStatusCard({
  initialRagIndex,
  isAvailable,
  projectId,
  onDataUpdate,
}: IndexingStatusCardProps) {
  const [ragIndex, setRagIndex] = useState<RagIndexData | null>(initialRagIndex)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const status: IndexationStatus = ragIndex?.indexationStatus ?? 'PENDING'
  const config = STATUS_CONFIG[status]

  // Simulated progress for IN_PROGRESS state
  const [progress, setProgress] = useState(0)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/rag/status`)
      if (!res.ok) return
      const json = await res.json()
      const data = json.data
      if (data?.ragIndex) {
        setRagIndex(data.ragIndex)
        onDataUpdate?.(data.ragIndex, data.documents ?? [])
      }
    } catch {
      // Erros de rede no polling sao silenciosos (UX.md Cenario E)
    }
  }, [projectId, onDataUpdate])

  // Polling a cada 2s durante IN_PROGRESS
  useEffect(() => {
    if (status !== 'IN_PROGRESS') {
      setProgress(0)
      return
    }

    // Simula progresso incremental
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 15, 95))
    }, 2000)

    const pollInterval = setInterval(fetchStatus, 2000)

    return () => {
      clearInterval(progressInterval)
      clearInterval(pollInterval)
    }
  }, [status, fetchStatus])

  // Quando completa, seta progresso para 100
  useEffect(() => {
    if (status === 'COMPLETE') {
      setProgress(100)
      const timer = setTimeout(() => setProgress(0), 1000)
      return () => clearTimeout(timer)
    }
  }, [status])

  async function handleStartIndexing() {
    if (!isAvailable || isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/rag/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message ?? 'Erro ao iniciar indexação.')
      }

      const json = await res.json()
      setRagIndex((prev) =>
        prev
          ? { ...prev, indexationStatus: 'IN_PROGRESS' }
          : {
              id: json.data.ragIndexId,
              projectId,
              indexationStatus: 'IN_PROGRESS',
              totalChunks: 0,
              lastIndexedAt: null,
              githubRepoUrl: null,
              createdAt: new Date().toISOString(),
            },
      )
      setProgress(0)
      toast.success('Indexação iniciada com sucesso.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar indexação.'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const buttonText =
    status === 'IN_PROGRESS'
      ? 'Indexando...'
      : status === 'COMPLETE' || status === 'FAILED'
        ? 'Re-indexar'
        : 'Iniciar Indexação'

  const buttonVariant =
    status === 'COMPLETE' || status === 'FAILED' ? 'outline' : 'primary'

  const isButtonDisabled =
    !isAvailable || status === 'IN_PROGRESS' || isSubmitting

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Status da Indexação
          </h2>
          <Badge variant={config.variant} className="ml-auto">
            {config.icon}
            <span>{config.label}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {status === 'PENDING' && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhum documento indexado ainda. Clique em &quot;Iniciar Indexação&quot; para processar os documentos do projeto.
            </p>
          )}

          {status === 'IN_PROGRESS' && (
            <div className="space-y-1">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Indexando documentos...
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${Math.round(progress)}%` }}
                  />
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums w-10 text-right">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          )}

          {status === 'COMPLETE' && (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {ragIndex?.totalChunks ?? 0} chunks indexados.
              </p>
              {ragIndex?.lastIndexedAt && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Última indexação: {formatTimestamp(ragIndex.lastIndexedAt)}
                </p>
              )}
            </div>
          )}

          {status === 'FAILED' && (
            <div
              className="flex items-start gap-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 mt-2"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-sm text-red-800 dark:text-red-300">
                {errorMessage ?? 'Falha durante a indexação. Tente novamente.'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t-0 pt-0">
        <Button
          variant={buttonVariant}
          size="md"
          className="w-full"
          disabled={isButtonDisabled}
          aria-disabled={isButtonDisabled ? 'true' : undefined}
          loading={status === 'IN_PROGRESS' || isSubmitting}
          title={!isAvailable ? 'Indisponível: serviço de embeddings offline' : undefined}
          onClick={handleStartIndexing}
        >
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  )
}
