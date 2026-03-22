'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-6xl font-bold text-red-500">500</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Algo deu errado
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Ocorreu um erro inesperado. Nossa equipe foi notificada.
        </p>
        <Button variant="primary" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
