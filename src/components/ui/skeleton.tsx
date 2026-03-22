import { cn } from '@/lib/utils'

interface SkeletonProps {
  variant?: 'text' | 'avatar' | 'card' | 'custom'
  width?: string | number
  height?: string | number
  lines?: number
  className?: string
}

export function Skeleton({ variant = 'text', width, height, lines = 3, className }: SkeletonProps) {
  const baseClass = 'animate-pulse rounded bg-slate-200 dark:bg-slate-700'

  if (variant === 'text') {
    return (
      <div role="status" aria-label="Carregando conteúdo..." aria-busy="true" className="space-y-2 w-full">
        <span className="sr-only">Carregando...</span>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={cn(baseClass, 'h-4', i === lines - 1 ? 'w-3/4' : 'w-full', className)}
            style={width ? { width } : undefined}
          />
        ))}
      </div>
    )
  }

  if (variant === 'avatar') {
    return (
      <div
        role="status"
        aria-label="Carregando..."
        aria-busy="true"
        className={cn(baseClass, 'h-10 w-10 rounded-full', className)}
        aria-hidden="true"
      >
        <span className="sr-only">Carregando...</span>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div role="status" aria-label="Carregando..." aria-busy="true" className={cn(baseClass, 'h-32 w-full rounded-lg', className)} aria-hidden="true">
        <span className="sr-only">Carregando...</span>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-label="Carregando..."
      aria-busy="true"
      aria-hidden="true"
      className={cn(baseClass, className)}
      style={{ width, height }}
    >
      <span className="sr-only">Carregando...</span>
    </div>
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  centered?: boolean
  label?: string
}

const spinnerSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function LoadingSpinner({ size = 'md', centered = false, label = 'Carregando...' }: LoadingSpinnerProps) {
  const spinner = (
    <div role="status" aria-label={label}>
      <svg
        aria-hidden="true"
        className={cn(spinnerSizes[size], 'border-2 border-current border-t-transparent rounded-full animate-spin text-indigo-500')}
        viewBox="0 0 24 24"
        fill="none"
      />
      <span className="sr-only">{label}</span>
    </div>
  )

  if (centered) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[200px]">
        {spinner}
      </div>
    )
  }

  return spinner
}
