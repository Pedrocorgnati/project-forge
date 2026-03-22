'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

const variantClasses = {
  primary: 'bg-indigo-500 hover:bg-indigo-600 text-white',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100',
  ghost: 'bg-transparent hover:bg-slate-50 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-300',
  destructive: 'bg-red-500 hover:bg-red-600 text-white',
  outline: 'border border-indigo-500 text-indigo-500 hover:bg-indigo-50 bg-transparent dark:hover:bg-indigo-950',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading ? 'true' : undefined}
        aria-disabled={isDisabled ? 'true' : undefined}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          'dark:focus-visible:ring-offset-slate-900',
          variantClasses[variant],
          sizeClasses[size],
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          loading && 'opacity-75',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg
              aria-hidden="true"
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Carregando...</span>
          </>
        ) : (
          <>
            {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
