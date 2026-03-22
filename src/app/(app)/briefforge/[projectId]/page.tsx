'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { StreamingText } from '@/components/ui/streaming-text'
import { AILoadingState } from '@/components/ui/ai-loading-state'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'

const AI_RESPONSE_DELAY_MS = 1500
const TOTAL_QUESTIONS = 7

type Message = { role: 'ai' | 'user'; content: string }

export default function BriefForgeSessionPage() {
  const params = useParams()
  const projectId = params.projectId as string
  void projectId

  const [started, setStarted] = useState(false)
  const [answer, setAnswer] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [progress, setProgress] = useState(0)

  async function handleStart() {
    setStarted(true)
    setIsStreaming(true)
    // TODO: Implementar backend - BriefService.startSession
    setTimeout(() => {
      setMessages([{ role: 'ai', content: 'Qual é o objetivo principal do projeto?' }])
      setIsStreaming(false)
      setProgress(1)
    }, AI_RESPONSE_DELAY_MS)
  }

  async function handleSend() {
    if (!answer.trim() || isStreaming) return
    const userMsg = answer.trim()
    setAnswer('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setIsStreaming(true)
    // TODO: Implementar backend - BriefService.answerQuestion
    setTimeout(() => {
      if (progress < TOTAL_QUESTIONS) {
        setMessages((prev) => [
          ...prev,
          { role: 'ai', content: 'Obrigado! Próxima pergunta: Quem são os usuários-alvo?' },
        ])
        setProgress((p) => p + 1)
      }
      setIsStreaming(false)
    }, AI_RESPONSE_DELAY_MS)
  }

  if (!started) {
    return (
      <div data-testid="briefforge-session-start" className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">BriefForge</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Entrevista de briefing</p>
        </div>
        <EmptyState
          icon={<MessageSquare size={32} />}
          title="Iniciar Briefing"
          description="Responda às perguntas da IA para definir o escopo do projeto."
          action={{ label: 'Iniciar Entrevista', onClick: handleStart }}
        />
      </div>
    )
  }

  return (
    <div data-testid="briefforge-session-page" className="space-y-4 max-w-3xl mx-auto">
      {/* Progress bar */}
      <div data-testid="briefforge-progress" className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Progresso da entrevista
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{progress}/{TOTAL_QUESTIONS}</span>
            <Badge variant="info">Em andamento</Badge>
          </div>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-[width] duration-500"
            style={{ width: `${(progress / TOTAL_QUESTIONS) * 100}%` }}
          />
        </div>
      </div>

      {/* Chat messages */}
      <div data-testid="briefforge-chat" className="space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={msg.role === 'ai' ? 'flex gap-3' : 'flex gap-3 flex-row-reverse'}
          >
            {msg.role === 'ai' && (
              <div className="w-8 h-8 bg-brand-light dark:bg-brand/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs" aria-hidden="true">🤖</span>
              </div>
            )}
            <Card variant="default" className={msg.role === 'user' ? 'bg-brand-light dark:bg-brand/10 border-brand/20' : ''}>
              <CardContent className="p-3">
                <p className="text-sm text-slate-700 dark:text-slate-300">{msg.content}</p>
              </CardContent>
            </Card>
          </div>
        ))}

        {isStreaming && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-brand-light dark:bg-brand/20 rounded-full flex items-center justify-center shrink-0">
              <span className="text-xs" aria-hidden="true">🤖</span>
            </div>
            <Card variant="default">
              <CardContent className="p-3">
                <AILoadingState module="BRIEFFORGE" />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Input area */}
      <div data-testid="briefforge-input-area" className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <Textarea
          data-testid="briefforge-answer-input"
          placeholder="Digite sua resposta..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={isStreaming}
          rows={3}
          maxLength={2000}
          className="resize-none border-0 shadow-none focus:ring-0 p-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
          }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-400">{answer.length}/2000</span>
          <Button
            data-testid="briefforge-send-button"
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!answer.trim() || isStreaming}
          >
            <Send size={14} aria-hidden="true" />
            Enviar
          </Button>
        </div>
      </div>
    </div>
  )
}
