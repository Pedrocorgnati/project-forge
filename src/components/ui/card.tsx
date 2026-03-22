import { cn } from '@/lib/utils'

interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive'
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

const variantClasses = {
  default: 'border border-slate-200 dark:border-slate-700 shadow-sm',
  elevated: 'shadow-md border-transparent',
  outlined: 'border-2 border-slate-300 dark:border-slate-600',
  interactive: 'border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-brand/40 dark:hover:border-brand/60 cursor-pointer transition-shadow transition-colors duration-150',
}

export function Card({ variant = 'default', className, children, onClick }: CardProps) {
  if (variant === 'interactive') {
    return (
      <article
        role="article"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        }}
        className={cn(
          'rounded-lg overflow-hidden bg-white dark:bg-slate-800',
          variantClasses[variant],
          className
        )}
      >
        {children}
      </article>
    )
  }

  return (
    <div className={cn('rounded-lg overflow-hidden bg-white dark:bg-slate-800', variantClasses[variant], className)}>
      {children}
    </div>
  )
}

interface CardSlotProps {
  className?: string
  children: React.ReactNode
}

export function CardHeader({ className, children }: CardSlotProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-slate-200 dark:border-slate-700', className)}>
      {children}
    </div>
  )
}

export function CardContent({ className, children }: CardSlotProps) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children }: CardSlotProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2', className)}>
      {children}
    </div>
  )
}
