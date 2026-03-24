'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Hook para copiar texto para a área de transferência.
 * Reseta o estado `copied` automaticamente após o timeout.
 *
 * @param timeout - Tempo em ms para resetar o estado (padrão: 2000)
 * @returns [copied, copy] — booleano + função de cópia
 */
export function useCopyToClipboard(
  timeout = 2000,
): [copied: boolean, copy: (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(
    async (text: string): Promise<void> => {
      if (typeof window === 'undefined' || !navigator.clipboard) {
        console.warn('[useCopyToClipboard] Clipboard API indisponível')
        return
      }

      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)

        // Limpa timeout anterior se existir
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
          setCopied(false)
          timeoutRef.current = null
        }, timeout)
      } catch {
        console.warn('[useCopyToClipboard] Falha ao copiar')
        setCopied(false)
      }
    },
    [timeout],
  )

  return [copied, copy]
}
