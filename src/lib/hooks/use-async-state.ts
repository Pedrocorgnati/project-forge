'use client'

import { useCallback, useMemo, useState } from 'react'
import type { AsyncState } from '@/types'

export interface UseAsyncStateReturn<T> {
  /** Estado atual */
  state: AsyncState<T>
  /** Transição para loading */
  setLoading: () => void
  /** Transição para success com dados */
  setSuccess: (data: T) => void
  /** Transição para error com mensagem */
  setError: (error: string) => void
  /** Reset para idle */
  reset: () => void
  /** Derivados booleanos */
  isIdle: boolean
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  /** Dados (undefined se não em success) */
  data: T | undefined
  /** Mensagem de erro (undefined se não em error) */
  error: string | undefined
}

const IDLE_STATE: AsyncState<never> = { status: 'idle' }
const LOADING_STATE: AsyncState<never> = { status: 'loading' }

/**
 * Hook para gerenciar estados assíncronos (idle → loading → success/error).
 * Elimina boilerplate de useState múltiplos.
 */
export function useAsyncState<T>(): UseAsyncStateReturn<T> {
  const [state, setState] = useState<AsyncState<T>>(IDLE_STATE)

  const setLoading = useCallback(() => {
    setState(LOADING_STATE)
  }, [])

  const setSuccess = useCallback((data: T) => {
    setState({ status: 'success', data })
  }, [])

  const setError = useCallback((error: string) => {
    setState({ status: 'error', error })
  }, [])

  const reset = useCallback(() => {
    setState(IDLE_STATE)
  }, [])

  const derived = useMemo(
    () => ({
      isIdle: state.status === 'idle',
      isLoading: state.status === 'loading',
      isSuccess: state.status === 'success',
      isError: state.status === 'error',
      data: state.status === 'success' ? state.data : undefined,
      error: state.status === 'error' ? state.error : undefined,
    }),
    [state],
  )

  return {
    state,
    setLoading,
    setSuccess,
    setError,
    reset,
    ...derived,
  }
}
