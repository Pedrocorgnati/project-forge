'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { ErrorState } from '@/components/ui/error-state'

export default function ChangeOrdersError({
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
      title="Erro ao carregar change orders"
      description="Não foi possível carregar as ordens de mudança. Tente novamente."
      retryFn={reset}
      homeLink="/projects"
      variant="full"
    />
  )
}
