'use client'

import { useCallback, useState } from 'react'

export interface UseDisclosureReturn {
  /** Estado atual — true se aberto */
  isOpen: boolean
  /** Abre o disclosure */
  open: () => void
  /** Fecha o disclosure */
  close: () => void
  /** Alterna entre aberto e fechado */
  toggle: () => void
  /** Callback compatível com Radix UI Dialog `onOpenChange` */
  onOpenChange: (open: boolean) => void
}

/**
 * Hook para controlar estados aberto/fechado.
 * Compatível com Radix UI Dialog via `onOpenChange`.
 *
 * @param initialOpen - Estado inicial (padrão: false)
 */
export function useDisclosure(initialOpen = false): UseDisclosureReturn {
  const [isOpen, setIsOpen] = useState(initialOpen)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  const onOpenChange = useCallback((value: boolean) => setIsOpen(value), [])

  return { isOpen, open, close, toggle, onOpenChange }
}
