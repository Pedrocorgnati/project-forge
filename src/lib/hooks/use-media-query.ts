'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Hook reativo para CSS media queries.
 * Retorna false durante SSR para evitar hydration mismatch.
 *
 * @param query - Media query CSS (ex: '(min-width: 768px)')
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = useCallback((): boolean => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia(query).matches
  }, [query])

  const [matches, setMatches] = useState<boolean>(false)

  // Sincroniza após hydration
  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query, getMatches])

  return matches
}
