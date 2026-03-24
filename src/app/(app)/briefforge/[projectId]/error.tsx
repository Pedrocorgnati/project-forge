'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { ErrorState } from '@/components/ui/error-state'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function BriefForgeError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div data-testid="briefforge-error" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          BriefForge
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Entrevista de briefing
        </p>
      </div>
      <ErrorState
        title="Erro ao carregar briefing"
        description="Não foi possível carregar a sessão de briefing. Verifique sua conexão e tente novamente."
        retryFn={reset}
        variant="retry"
      />
    </div>
  )
}
