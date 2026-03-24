'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { checkAIHealth } from '@/lib/ai/health-check'

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface AIHealthState {
  /** IA está disponível para uso */
  isAvailable: boolean
  /** Latência da última verificação em ms */
  latencyMs: number | null
  /** Verificação em andamento */
  isChecking: boolean
  /** Re-executa o health check manualmente */
  refresh: () => void
}

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

const AIHealthContext = createContext<AIHealthState | null>(null)

// ─── PROVIDER ────────────────────────────────────────────────────────────────

interface AIHealthProviderProps {
  children: ReactNode
  /** Intervalo de re-check automático em ms (0 = desabilitado, padrão: 0) */
  recheckInterval?: number
}

export function AIHealthProvider({
  children,
  recheckInterval = 0,
}: AIHealthProviderProps) {
  const [isAvailable, setIsAvailable] = useState(false)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  const performCheck = useCallback(async () => {
    setIsChecking(true)
    try {
      const result = await checkAIHealth()
      setIsAvailable(result.available)
      setLatencyMs(result.latencyMs ?? null)
    } catch {
      setIsAvailable(false)
      setLatencyMs(null)
    } finally {
      setIsChecking(false)
    }
  }, [])

  // Check inicial no mount
  useEffect(() => {
    performCheck()
  }, [performCheck])

  // Re-check periódico (opcional)
  useEffect(() => {
    if (recheckInterval <= 0) return

    const interval = setInterval(performCheck, recheckInterval)
    return () => clearInterval(interval)
  }, [recheckInterval, performCheck])

  const value = useMemo<AIHealthState>(
    () => ({
      isAvailable,
      latencyMs,
      isChecking,
      refresh: performCheck,
    }),
    [isAvailable, latencyMs, isChecking, performCheck],
  )

  return (
    <AIHealthContext.Provider value={value}>
      {children}
    </AIHealthContext.Provider>
  )
}

// ─── HOOK ────────────────────────────────────────────────────────────────────

/**
 * Acessa o estado de saúde da IA.
 * Deve ser usado dentro de `<AIHealthProvider>`.
 */
export function useAIHealth(): AIHealthState {
  const context = useContext(AIHealthContext)
  if (!context) {
    throw new Error(
      'useAIHealth deve ser usado dentro de <AIHealthProvider>',
    )
  }
  return context
}
