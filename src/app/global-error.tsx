'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
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
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-xl font-semibold">Algo deu errado</h2>
          <p className="text-sm text-gray-500">
            Um erro inesperado ocorreu. Nossa equipe foi notificada.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-gray-400">
              Código: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
