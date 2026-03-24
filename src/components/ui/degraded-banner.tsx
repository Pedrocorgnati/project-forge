'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

type DegradedModule = 'BRIEFFORGE' | 'ESTIMAI' | 'HANDOFFAI'

const moduleMessages: Record<DegradedModule, string> = {
  BRIEFFORGE: 'BriefForge em modo limitado: IA indisponível. O briefing pode ser feito manualmente.',
  ESTIMAI: 'EstimaAI em modo limitado: usando apenas benchmarks históricos.',
  HANDOFFAI: 'HandoffAI em modo limitado: busca vetorial indisponível. Consulte a documentação diretamente.',
}

interface DegradedBannerProps {
  module: DegradedModule
  isAvailable?: boolean
  onDismiss?: () => void
  /** Se fornecido, exibe countdown e chama onRetry quando chegar a 0 */
  retryAfterMs?: number
  onRetry?: () => void
  className?: string
}

export function DegradedBanner({ module, isAvailable = false, onDismiss, retryAfterMs, onRetry, className }: DegradedBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(STORAGE_KEYS.DEGRADED_FLAG(module)) === 'true'
  })
  const [secondsLeft, setSecondsLeft] = useState(() =>
    retryAfterMs != null ? Math.ceil(retryAfterMs / 1000) : null
  )

  useEffect(() => {
    if (isAvailable) {
      localStorage.removeItem(STORAGE_KEYS.DEGRADED_FLAG(module))
    }
  }, [isAvailable, module])

  // Countdown timer que chama onRetry ao zerar
  useEffect(() => {
    if (secondsLeft == null || secondsLeft <= 0) {
      if (secondsLeft === 0) onRetry?.()
      return
    }
    const id = setInterval(() => setSecondsLeft((s) => (s != null ? s - 1 : null)), 1000)
    return () => clearInterval(id)
  }, [secondsLeft, onRetry])

  const effectiveDismissed = !isAvailable && dismissed

  if (isAvailable || effectiveDismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem(STORAGE_KEYS.DEGRADED_FLAG(module), 'true')
    onDismiss?.()
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-label={`Aviso de modo degradado: ${module}`}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        'bg-amber-50 border-amber-200 text-amber-800',
        'dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200',
        className
      )}
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-5">Modo Limitado</p>
        <p className="text-sm leading-5 mt-0.5">{moduleMessages[module]}</p>
        {secondsLeft != null && secondsLeft > 0 && (
          <p className="text-xs leading-5 mt-0.5 text-amber-600 dark:text-amber-400">
            Tentando reconectar em {secondsLeft}s...
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Fechar aviso de modo limitado"
        onClick={handleDismiss}
        className={cn(
          'shrink-0 rounded p-0.5 ml-1',
          'text-amber-600 dark:text-amber-300',
          'hover:bg-amber-100 dark:hover:bg-amber-800/40',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500',
          'transition-colors'
        )}
      >
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
