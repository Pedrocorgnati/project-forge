'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ProfitabilityError({
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
    <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[300px]">
      <AlertTriangle className="h-10 w-10 text-red-500" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Erro ao carregar rentabilidade
      </h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        Ocorreu um erro inesperado ao carregar os dados de rentabilidade.
        Tente novamente ou entre em contato com o suporte.
      </p>
      <Button onClick={reset} variant="outline">
        Tentar novamente
      </Button>
    </div>
  )
}
