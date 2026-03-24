import { Loader2, Bot } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StreamingText } from '@/components/ui/streaming-text'
import { cn } from '@/lib/utils'
import { SourceCitations } from './SourceCitations'

interface SourceDoc {
  documentTitle?: string
  excerpt?: string
}

interface AnswerDisplayProps {
  query: string
  answer: string
  sourceDocs: SourceDoc[]
  isStreaming: boolean
}

export function AnswerDisplay({ query, answer, sourceDocs, isStreaming }: AnswerDisplayProps) {
  return (
    <Card className={cn('border-brand/20 bg-brand-light/50 dark:bg-brand/10')}>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Query */}
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {query}
          </p>

          {/* Answer */}
          <div className="flex items-start gap-2">
            {isStreaming ? (
              <Loader2
                className="w-5 h-5 text-brand animate-spin shrink-0 mt-0.5"
                aria-hidden="true"
              />
            ) : (
              <Bot
                className="w-5 h-5 text-brand shrink-0 mt-0.5"
                aria-hidden="true"
              />
            )}
            <div className="flex-1 min-w-0">
              {!answer && isStreaming ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  Gerando resposta...
                </p>
              ) : (
                <StreamingText
                  content={answer}
                  isStreaming={isStreaming}
                  as="div"
                  className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap"
                />
              )}
            </div>
          </div>

          {/* Sources */}
          {sourceDocs.length > 0 && (
            <SourceCitations sourceDocs={sourceDocs} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
