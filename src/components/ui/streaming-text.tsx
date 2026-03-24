'use client'

import { cn } from '@/lib/utils'

interface StreamingTextProps {
  content: string
  isStreaming: boolean
  as?: 'p' | 'div' | 'span'
  className?: string
}

export function StreamingText({ content, isStreaming, as: Tag = 'p', className }: StreamingTextProps) {
  if (!content && !isStreaming) return null

  return (
    <Tag
      aria-live="polite"
      aria-label={isStreaming ? 'Resposta da IA sendo gerada' : 'Resposta da IA'}
      className={className}
    >
      {content}
      {isStreaming && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block animate-pulse text-brand/70 dark:text-brand select-none"
        >
          |
        </span>
      )}
    </Tag>
  )
}
