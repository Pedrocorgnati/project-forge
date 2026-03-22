'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface ErrorStateProps {
  title?: string
  description?: string
  retryFn?: () => void | Promise<void>
  homeLink?: string
  contactEmail?: string
  variant?: 'retry' | 'redirect' | 'contact' | 'full'
}

export function ErrorState({
  title = 'Algo deu errado',
  description = 'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
  retryFn,
  homeLink = '/',
  contactEmail,
  variant = 'retry',
}: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false)

  const handleRetry = async () => {
    if (!retryFn) return
    setRetrying(true)
    try {
      await retryFn()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <section
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="w-12 h-12 text-red-400 mb-4" aria-hidden="true">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">{description}</p>
      <div className={cn('flex gap-3', (variant === 'full') ? 'flex-col items-center' : 'flex-wrap justify-center')}>
        {(variant === 'retry' || variant === 'full') && retryFn && (
          <Button variant="primary" size="md" loading={retrying} onClick={handleRetry}>
            Tentar novamente
          </Button>
        )}
        {(variant === 'redirect' || variant === 'full') && (
          <a href={homeLink}>
            <Button variant="ghost" size="md">Voltar ao início</Button>
          </a>
        )}
        {(variant === 'contact' || variant === 'full') && contactEmail && (
          <a href={`mailto:${contactEmail}`} className="text-indigo-500 underline text-sm">
            Contate o suporte
          </a>
        )}
      </div>
    </section>
  )
}
