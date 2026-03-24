'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { ErrorState } from '@/components/ui/error-state'

export default function ScopeAlertsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <ErrorState
      title="Erro ao carregar alertas de escopo"
      description="Não foi possível carregar os alertas de escopo. Tente novamente."
      retryFn={reset}
      homeLink="/projects"
      variant="full"
    />
  )
}
