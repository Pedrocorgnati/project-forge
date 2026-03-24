'use client'

// P053 — Hook para retry automático de sessão após 1 min de offline
// Monitora a conectividade e, ao reconectar, aguarda 1s e chama o callback de retry.

import { useCallback, useEffect, useRef, useState } from 'react'

const RETRY_DELAY_MS = 1 * 60 * 1000 // 1 minuto após reconectar

interface UseOfflineSessionRetryOptions {
  /** Callback chamado quando a sessão deve ser re-validada após reconnect */
  onRetry: () => void | Promise<void>
  /** Se false, o hook não faz nada (útil para desativar em contextos SSR) */
  enabled?: boolean
}

/**
 * Hook para auto-retry de sessão após período offline.
 * Quando o navegador detecta reconexão após 1+ min offline,
 * chama `onRetry` para re-validar a sessão do usuário.
 *
 * Uso:
 *   useOfflineSessionRetry({ onRetry: () => router.refresh() })
 */
export function useOfflineSessionRetry({
  onRetry,
  enabled = true,
}: UseOfflineSessionRetryOptions) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const offlineSinceRef = useRef<number | null>(null)
  const retryTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const handleOnline = useCallback(() => {
    setIsOnline(true)

    const offlineDuration =
      offlineSinceRef.current != null ? Date.now() - offlineSinceRef.current : 0
    offlineSinceRef.current = null

    if (offlineDuration >= RETRY_DELAY_MS) {
      // Estava offline por 1+ min: retry imediato
      void onRetry()
    }
    // Se ficou offline por menos de 1 min, não faz retry (evita ruído)
  }, [onRetry])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
    offlineSinceRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [enabled, handleOnline, handleOffline])

  return { isOnline }
}
