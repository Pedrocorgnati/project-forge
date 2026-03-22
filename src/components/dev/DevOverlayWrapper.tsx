'use client'

import { DevDataTestOverlay } from './DataTestOverlay'

/**
 * Wrapper client-only para o DevDataTestOverlay.
 * Renderizado condicionalmente apenas em desenvolvimento, no root layout.
 */
export function DevOverlayWrapper() {
  if (process.env.NODE_ENV !== 'development') return null
  return <DevDataTestOverlay />
}
