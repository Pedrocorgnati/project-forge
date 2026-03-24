'use client'

import { Bot } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StreamingText } from '@/components/ui/streaming-text'

interface QuestionCardProps {
  text: string
  streaming?: boolean
  order?: number
}

export function QuestionCard({ text, streaming = false, order }: QuestionCardProps) {
  return (
    <div
      className="flex gap-3"
      role="article"
      aria-label={order ? `Pergunta ${order} da IA` : 'Pergunta da IA'}
    >
      <div
        className="w-8 h-8 bg-brand-light dark:bg-brand/20 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <Bot size={16} className="text-brand dark:text-brand" />
      </div>
      <Card variant="default" className="flex-1">
        <CardContent className="p-3">
          {streaming ? (
            <StreamingText
              content={text}
              isStreaming
              as="p"
              className="text-sm text-slate-700 dark:text-slate-300"
            />
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300">{text}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
