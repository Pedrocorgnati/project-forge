'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { ErrorState } from '@/components/ui/error-state'

export default function CostsSettingsError({
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
      title="Erro ao carregar configurações de custos"
      description="Não foi possível carregar as configurações de custos. Tente novamente."
      retryFn={reset}
      homeLink="/projects"
      variant="full"
    />
  )
}
