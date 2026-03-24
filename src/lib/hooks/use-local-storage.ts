'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Hook para persistir estado no localStorage com SSR guard.
 *
 * @param key - Chave do localStorage
 * @param initialValue - Valor inicial (usado no SSR e quando a chave não existe)
 * @returns [value, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : initialValue
    } catch {
      console.warn(`[useLocalStorage] Erro ao ler chave "${key}"`)
      return initialValue
    }
  }, [key, initialValue])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  // Sincroniza com localStorage após hydration
  useEffect(() => {
    setStoredValue(readValue())
  }, [readValue])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (typeof window === 'undefined') {
        console.warn(`[useLocalStorage] Não é possível setar "${key}" no SSR`)
        return
      }

      try {
        const newValue = value instanceof Function ? value(storedValue) : value
        window.localStorage.setItem(key, JSON.stringify(newValue))
        setStoredValue(newValue)

        // Dispara evento para sincronizar outras tabs/hooks
        window.dispatchEvent(new StorageEvent('storage', { key }))
      } catch {
        console.warn(`[useLocalStorage] Erro ao gravar chave "${key}"`)
      }
    },
    [key, storedValue],
  )

  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
      window.dispatchEvent(new StorageEvent('storage', { key }))
    } catch {
      console.warn(`[useLocalStorage] Erro ao remover chave "${key}"`)
    }
  }, [key, initialValue])

  // Escuta mudanças de outras tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        setStoredValue(readValue())
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, readValue])

  return [storedValue, setValue, removeValue]
}
