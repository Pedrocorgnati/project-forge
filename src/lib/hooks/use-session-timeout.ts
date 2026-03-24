'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Hook para detectar inatividade e disparar callback de sessão expirada.
 * Monitora eventos do usuário (mouse, teclado, scroll, toque) e reinicia
 * o timer a cada interação.
 *
 * @param timeoutMs - Tempo de inatividade em ms antes de expirar (padrão: 30min)
 */
export function useSessionTimeout(timeoutMs: number = 30 * 60 * 1000) {
  const [isExpired, setIsExpired] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setIsExpired(true), timeoutMs)
  }, [timeoutMs])

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    // Expor evento customizado para testes E2E
    const handleSimulateTimeout = () => setIsExpired(true)
    window.addEventListener('__simulateSessionTimeout', handleSimulateTimeout)

    return () => {
      events.forEach((e) => document.removeEventListener(e, resetTimer))
      window.removeEventListener('__simulateSessionTimeout', handleSimulateTimeout)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  return { isExpired, resetTimer }
}
