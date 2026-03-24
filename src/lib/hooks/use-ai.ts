'use client'

import { useCallback, useRef, useState } from 'react'
import type { AIGenerateOptions, AIStreamOptions } from '@/lib/ai/provider'
import { ClaudeCliProvider } from '@/lib/ai/claude-cli-provider'
import { MESSAGES } from '@/lib/constants/messages'
import { useAIHealth } from '@/lib/ai/context'

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface UseAIReturn {
  /** Gera conteúdo de forma síncrona (aguarda resposta completa) */
  generate: (prompt: string, options?: AIGenerateOptions) => Promise<string | null>
  /** Gera conteúdo via streaming */
  stream: (prompt: string, options?: Omit<AIStreamOptions, 'abortSignal'>) => Promise<void>
  /** Aborta a operação em andamento */
  abort: () => void
  /** Conteúdo acumulado (atualizado durante streaming) */
  content: string
  /** Streaming em andamento */
  isStreaming: boolean
  /** Generate em andamento */
  isLoading: boolean
  /** Último erro */
  error: string | null
  /** IA disponível (do AIHealthContext) */
  isAvailable: boolean
  /** Limpa conteúdo e erro */
  reset: () => void
}

// ─── HOOK ────────────────────────────────────────────────────────────────────

/**
 * Hook principal de interação com IA.
 * Consome AIHealthContext para saber se a IA está disponível.
 * Usa AbortController para cancelamento de operações.
 */
export function useAI(): UseAIReturn {
  const { isAvailable } = useAIHealth()

  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const providerRef = useRef<ClaudeCliProvider | null>(null)

  const getProvider = useCallback((): ClaudeCliProvider => {
    if (!providerRef.current) {
      providerRef.current = new ClaudeCliProvider()
    }
    return providerRef.current
  }, [])

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setIsLoading(false)
  }, [])

  const reset = useCallback(() => {
    abort()
    setContent('')
    setError(null)
  }, [abort])

  const generate = useCallback(
    async (
      prompt: string,
      options?: AIGenerateOptions,
    ): Promise<string | null> => {
      if (!isAvailable) {
        setError(MESSAGES.ERROR.AI_UNAVAILABLE)
        return null
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      setIsLoading(true)
      setError(null)

      try {
        const provider = getProvider()
        const result = await provider.generate(prompt, {
          ...options,
          abortSignal: controller.signal,
        })
        setContent(result)
        return result
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null
        }
        const message =
          err instanceof Error ? err.message : MESSAGES.ERROR.GENERIC
        setError(message)
        return null
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [isAvailable, getProvider],
  )

  const stream = useCallback(
    async (
      prompt: string,
      options?: Omit<AIStreamOptions, 'abortSignal'>,
    ): Promise<void> => {
      if (!isAvailable) {
        setError(MESSAGES.ERROR.AI_UNAVAILABLE)
        return
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      setIsStreaming(true)
      setError(null)
      setContent('')

      try {
        const provider = getProvider()
        const generator = provider.stream(prompt, {
          ...options,
          abortSignal: controller.signal,
          onChunk: (chunk: string) => {
            setContent((prev) => prev + chunk)
            options?.onChunk?.(chunk)
          },
        })

        for await (const chunk of generator) {
          if (controller.signal.aborted) break
          // O conteúdo já é acumulado via onChunk
          void chunk
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        const message =
          err instanceof Error ? err.message : MESSAGES.ERROR.GENERIC
        setError(message)
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [isAvailable, getProvider],
  )

  return {
    generate,
    stream,
    abort,
    content,
    isStreaming,
    isLoading,
    error,
    isAvailable,
    reset,
  }
}
