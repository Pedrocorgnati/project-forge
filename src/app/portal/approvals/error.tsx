'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { ErrorState } from '@/components/ui/error-state'

export default function PortalApprovalsError({
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
      title="Erro ao carregar aprovações"
      description="Não foi possível carregar as aprovações do portal. Tente novamente."
      retryFn={reset}
      homeLink="/portal/dashboard"
      variant="full"
    />
  )
}
