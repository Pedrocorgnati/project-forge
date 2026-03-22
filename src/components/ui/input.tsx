'use client'

import { forwardRef, useState } from 'react'
import { Eye, EyeOff, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  valid?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, valid, leftIcon, rightIcon, className, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            'w-full rounded-md border px-3 py-2 text-sm',
            'bg-white dark:bg-slate-800',
            'text-slate-900 dark:text-slate-50',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
            'dark:focus-visible:ring-offset-slate-900',
            'disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed',
            error
              ? 'border-red-500 dark:border-red-400'
              : valid
              ? 'border-green-500'
              : 'border-slate-300 dark:border-slate-600',
            leftIcon && 'pl-9',
            (rightIcon || valid) && 'pr-9',
            className
          )}
          {...props}
        />
        {valid && !error && !rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 w-4 h-4 pointer-events-none">
            <Check size={16} />
          </span>
        )}
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false)

    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn('pr-10', className)}
          {...props}
        />
        <button
          type="button"
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={show}
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 w-4 h-4 cursor-pointer transition-colors focus:outline-none"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = 'PasswordInput'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={error ? 'true' : undefined}
      className={cn(
        'w-full rounded-md border px-3 py-2 text-sm resize-y min-h-[80px]',
        'bg-white dark:bg-slate-800',
        'text-slate-900 dark:text-slate-50',
        'placeholder:text-slate-400 dark:placeholder:text-slate-500',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-slate-900',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        error ? 'border-red-500 dark:border-red-400' : 'border-slate-300 dark:border-slate-600',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[]
  placeholder?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, error, className, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          'w-full rounded-md border px-3 py-2 text-sm appearance-none cursor-pointer',
          'bg-white dark:bg-slate-800',
          'text-slate-900 dark:text-slate-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error ? 'border-red-500 dark:border-red-400' : 'border-slate-300 dark:border-slate-600',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </span>
    </div>
  )
)
Select.displayName = 'Select'
