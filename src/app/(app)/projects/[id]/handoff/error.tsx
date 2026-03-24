'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { ErrorState } from '@/components/ui/error-state'

export default function HandoffError({
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
      title="Erro ao carregar HandoffAI"
      description="Não foi possível carregar a indexação de documentos. Verifique sua conexão e tente novamente."
      retryFn={reset}
      homeLink="/projects"
      variant="full"
    />
  )
}
