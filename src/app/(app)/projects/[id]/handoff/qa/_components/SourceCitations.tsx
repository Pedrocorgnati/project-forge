'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SourceDoc {
  documentTitle?: string
  excerpt?: string
}

interface SourceCitationsProps {
  sourceDocs: SourceDoc[]
}

export function SourceCitations({ sourceDocs }: SourceCitationsProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (sourceDocs.length === 0) return null

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium',
          'text-slate-500 dark:text-slate-400',
          'hover:text-slate-700 dark:hover:text-slate-200',
          'transition-colors',
        )}
        aria-expanded={isOpen}
      >
        <FileText className="w-3.5 h-3.5" aria-hidden="true" />
        {sourceDocs.length} fonte{sourceDocs.length !== 1 ? 's' : ''} consultada{sourceDocs.length !== 1 ? 's' : ''}
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {isOpen && (
        <ol className="mt-2 space-y-2">
          {sourceDocs.map((doc, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400"
            >
              <span className="shrink-0 font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                {index + 1}.
              </span>
              <div className="min-w-0">
                {doc.documentTitle && (
                  <p className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {doc.documentTitle}
                  </p>
                )}
                {doc.excerpt && (
                  <p className="text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {doc.excerpt}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
