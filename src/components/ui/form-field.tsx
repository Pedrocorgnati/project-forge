import React from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label?: string
  required?: boolean
  helper?: string
  error?: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}

export function FormField({ label, required, helper, error, htmlFor, className, children }: FormFieldProps) {
  // Inject aria-describedby into the direct child input element
  const describedBy = htmlFor
    ? error
      ? `${htmlFor}-error`
      : helper
      ? `${htmlFor}-helper`
      : undefined
    : undefined

  const enhancedChildren =
    describedBy && React.isValidElement(children)
      ? React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
          'aria-describedby': describedBy,
        })
      : children

  return (
    <div className={cn('flex flex-col gap-1 w-full', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && (
            <span aria-label="obrigatório" className="text-red-500 ml-0.5">*</span>
          )}
        </label>
      )}
      {enhancedChildren}
      {helper && !error && (
        <p id={htmlFor ? `${htmlFor}-helper` : undefined} className="text-xs text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      )}
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="text-xs text-red-500 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  )
}
