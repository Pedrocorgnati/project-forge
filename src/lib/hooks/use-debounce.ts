'use client'

import { useEffect, useState } from 'react'

/**
 * Debounce de um valor reativo.
 * Útil para inputs de busca — evita chamadas excessivas à API.
 *
 * @param value - Valor a ser debounced
 * @param delay - Delay em ms (padrão: 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
