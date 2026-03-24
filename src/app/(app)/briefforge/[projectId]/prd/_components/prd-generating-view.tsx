'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { API } from '@/lib/constants/api-routes'

interface PRDGeneratingViewProps {
  briefId: string
  projectId: string
}

const POLL_INTERVAL_MS = 3000
const TIMEOUT_WARNING_S = 120
const TIMEOUT_STOP_S = 300

export function PRDGeneratingView({ briefId }: PRDGeneratingViewProps) {
  const router = useRouter()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [stopped, setStopped] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setStopped(true)
  }, [])

  useEffect(() => {
    // Contador de segundos
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1
        if (next >= TIMEOUT_STOP_S) {
          stopPolling()
        }
        return next
      })
    }, 1000)

    // Polling do status
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(API.BRIEF_PRD(briefId))

        if (res.ok) {
          // 200 = READY
          stopPolling()
          router.refresh()
          return
        }

        if (res.status === 500) {
          // ERROR no servidor
          stopPolling()
          setError('Ocorreu um erro durante a geração. Tente novamente.')
          return
        }

        // 202 = GENERATING, continuar polling
      } catch {
        // Erro de rede — continuar tentando
      }
    }, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [briefId, router, stopPolling])

  async function handleRetry() {
    setError(null)
    setStopped(false)
    setElapsedSeconds(0)

    try {
      const res = await fetch(API.BRIEF_PRD(briefId), { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Erro ao reiniciar geração')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  // ── Estado de erro ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        data-testid="prd-generating-error"
        className="max-w-3xl mx-auto"
      >
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 rounded-lg border px-4 py-3 bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-5">
              Erro na geração
            </p>
            <p className="text-sm leading-5 mt-0.5">{error}</p>
          </div>
        </div>
        <div className="flex justify-center mt-4">
          <Button
            variant="primary"
            size="md"
            onClick={handleRetry}
            data-testid="prd-retry-btn"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  // ── Timeout (> 2min warning) ─────────────────────────────────────────────
  if (stopped || elapsedSeconds >= TIMEOUT_STOP_S) {
    return (
      <div
        data-testid="prd-generating-timeout"
        className="max-w-3xl mx-auto"
      >
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 rounded-lg border px-4 py-3 bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-5">
              Tempo limite excedido
            </p>
            <p className="text-sm leading-5 mt-0.5">
              A geração do PRD está demorando mais que o esperado. Tente
              novamente mais tarde ou entre em contato com o suporte.
            </p>
          </div>
        </div>
        <div className="flex justify-center mt-4">
          <Button
            variant="primary"
            size="md"
            onClick={handleRetry}
            data-testid="prd-retry-btn"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  // ── Estado de geracao (polling ativo) ────────────────────────────────────
  return (
    <div
      data-testid="prd-generating-spinner"
      className="max-w-3xl mx-auto"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center justify-center py-12 px-4 space-y-6">
        {/* Spinner com icone central */}
        <div className="relative">
          <div
            className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-500 dark:border-t-indigo-400 rounded-full animate-spin"
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText
              size={20}
              className="text-brand dark:text-brand"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Gerando PRD...
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            A IA está analisando o briefing e gerando o documento de requisitos.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
            {elapsedSeconds}s decorridos
          </p>
        </div>

        {/* Warning apos 2 minutos */}
        {elapsedSeconds >= TIMEOUT_WARNING_S && (
          <div className="text-xs text-amber-600 dark:text-amber-400 text-center max-w-xs">
            A geração está demorando mais que o usual. Aguarde mais um momento...
          </div>
        )}
      </div>

      <span className="sr-only">
        Gerando documento de requisitos do produto. {elapsedSeconds} segundos
        decorridos.
      </span>
    </div>
  )
}
