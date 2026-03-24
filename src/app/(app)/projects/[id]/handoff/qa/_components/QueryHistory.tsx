'use client'

import { useState } from 'react'
import { History, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'
import { SourceCitations } from './SourceCitations'

interface SourceDoc {
  documentTitle?: string
  excerpt?: string
}

interface QueryRecord {
  id: string
  query: string
  answer: string | null
  sources: SourceDoc[]
  createdAt: string
}

interface QueryHistoryProps {
  queries: QueryRecord[]
}

function HistoryItem({ item }: { item: QueryRecord }) {
  const [expanded, setExpanded] = useState(false)

  const answerPreview = item.answer
    ? item.answer.length > 120
      ? item.answer.slice(0, 120) + '...'
      : item.answer
    : 'Sem resposta'

  return (
    <div className="border-b border-slate-100 dark:border-slate-700 last:border-b-0 py-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left group"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {item.query}
            </p>
            {!expanded && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                {answerPreview}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {formatDateTime(item.createdAt)}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 pl-0">
          {item.answer ? (
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {item.answer}
            </p>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">
              Sem resposta registrada.
            </p>
          )}
          {item.sources.length > 0 && (
            <div className="mt-2">
              <SourceCitations sourceDocs={item.sources} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function QueryHistory({ queries }: QueryHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Historico de Perguntas ({queries.length})
          </h2>
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y-0">
          {queries.map((q) => (
            <HistoryItem key={q.id} item={q} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
