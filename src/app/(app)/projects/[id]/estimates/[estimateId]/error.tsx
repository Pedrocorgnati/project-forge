'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { ErrorState } from '@/components/ui/error-state'

export default function EstimateDetailError({
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
      title="Erro ao carregar estimativa"
      description="Não foi possível carregar os detalhes desta estimativa. Tente novamente."
      retryFn={reset}
      homeLink="/projects"
      variant="full"
    />
  )
}
