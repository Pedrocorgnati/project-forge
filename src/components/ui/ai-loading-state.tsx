'use client'

import { cn } from '@/lib/utils'

type AIModule = 'BRIEFFORGE' | 'ESTIMAI' | 'HANDOFFAI'

const defaultMessages: Record<AIModule, string> = {
  BRIEFFORGE: 'BriefForge processando sua entrevista...',
  ESTIMAI: 'EstimaAI calculando estimativas de custo...',
  HANDOFFAI: 'HandoffAI buscando contexto relevante...',
}

interface AILoadingStateProps {
  module?: AIModule
  message?: string
  className?: string
}

export function AILoadingState({ module, message, className }: AILoadingStateProps) {
  const displayMessage = message || (module ? defaultMessages[module] : 'Processando com IA...')

  return (
    <div
      role="status"
      aria-label="IA processando"
      aria-live="polite"
      className={cn(
        'flex items-center gap-3 py-3 px-4 rounded-lg',
        'bg-white dark:bg-slate-800',
        'border border-slate-100 dark:border-slate-700',
        'shadow-sm',
        className
      )}
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-brand dark:text-brand shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
      <span className="text-sm text-slate-600 dark:text-slate-300 font-medium min-w-0">
        {displayMessage}
      </span>
      <div className="flex items-center gap-1 ml-1" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-brand animate-pulse [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-brand animate-pulse [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-brand animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  )
}
