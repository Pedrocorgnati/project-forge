'use client'

import { useState, useRef, useCallback } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { AnswerDisplay } from './AnswerDisplay'

interface QueryInputProps {
  projectId: string
  aiAvailable: boolean
}

interface SourceDoc {
  documentTitle?: string
  excerpt?: string
}

interface QueryState {
  queryId: string | null
  query: string
  streamedAnswer: string
  sourceDocs: SourceDoc[]
  isStreaming: boolean
  isDone: boolean
}

export function QueryInput({ projectId, aiAvailable }: QueryInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [queryState, setQueryState] = useState<QueryState | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const trimmedInput = inputValue.trim()
  const isLoading = queryState?.isStreaming ?? false
  const canSubmit = aiAvailable && !isLoading && trimmedInput.length >= 3

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    // Abort previous request if any
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const currentQuery = trimmedInput
    setInputValue('')
    setQueryState({
      queryId: null,
      query: currentQuery,
      streamedAnswer: '',
      sourceDocs: [],
      isStreaming: true,
      isDone: false,
    })

    try {
      const res = await fetch(`/api/projects/${projectId}/rag/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const message = errorData?.error?.message ?? 'Erro ao processar pergunta.'
        toast.error(message)
        setQueryState((prev) =>
          prev ? { ...prev, isStreaming: false, isDone: true } : null,
        )
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        toast.error('Erro ao iniciar stream de resposta.')
        setQueryState((prev) =>
          prev ? { ...prev, isStreaming: false, isDone: true } : null,
        )
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue

          try {
            const event = JSON.parse(trimmed.slice(6))

            switch (event.type) {
              case 'init':
                setQueryState((prev) =>
                  prev
                    ? {
                        ...prev,
                        queryId: event.queryId,
                        sourceDocs: event.sourceDocs ?? [],
                      }
                    : null,
                )
                break

              case 'token':
                setQueryState((prev) =>
                  prev
                    ? {
                        ...prev,
                        streamedAnswer: prev.streamedAnswer + (event.content ?? ''),
                      }
                    : null,
                )
                break

              case 'done':
                setQueryState((prev) =>
                  prev ? { ...prev, isStreaming: false, isDone: true } : null,
                )
                break

              case 'error':
                toast.error(event.message ?? 'Erro na geração da resposta.')
                setQueryState((prev) =>
                  prev ? { ...prev, isStreaming: false, isDone: true } : null,
                )
                break
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      // Ensure streaming is marked as done
      setQueryState((prev) =>
        prev && prev.isStreaming ? { ...prev, isStreaming: false, isDone: true } : prev,
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast.error('Erro de conexão. Tente novamente.')
      setQueryState((prev) =>
        prev ? { ...prev, isStreaming: false, isDone: true } : null,
      )
    }
  }, [canSubmit, trimmedInput, projectId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <label
              htmlFor="qa-input"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Sua pergunta
            </label>
            <textarea
              id="qa-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={1000}
              rows={3}
              placeholder="Ex: Como funciona a autenticação neste projeto?"
              disabled={!aiAvailable}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm resize-none',
                'border-slate-300 dark:border-slate-600',
                'bg-white dark:bg-slate-800',
                'text-slate-900 dark:text-slate-50',
                'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {inputValue.length}/1000 caracteres
                {!aiAvailable && ' — IA indisponível'}
              </span>
              <Button
                variant="primary"
                size="sm"
                disabled={!canSubmit}
                loading={isLoading}
                onClick={handleSubmit}
                icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              >
                {isLoading ? 'Gerando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {queryState && (
        <AnswerDisplay
          query={queryState.query}
          answer={queryState.streamedAnswer}
          sourceDocs={queryState.sourceDocs}
          isStreaming={queryState.isStreaming}
        />
      )}
    </div>
  )
}
