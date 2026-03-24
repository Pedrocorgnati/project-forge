// ─── AI INSIGHTS PANEL ───────────────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-7 / ST003
// Painel de insights de IA — visível apenas para SOCIO

'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { AIInsightsFallbackBanner } from './AIInsightsFallbackBanner'
import { toast } from '@/components/ui/toast'

interface AIInsightsPanelProps {
  projectId: string
  userRole: string
  currentPL: {
    revenue: number
    cost: number
    margin: number
    marginPct: number
    hoursLogged: number
    billableRatio: number
    period: string
  }
}

type InsightStatus = 'idle' | 'loading' | 'success' | 'degraded'

export function AIInsightsPanel({ projectId, userRole, currentPL }: AIInsightsPanelProps) {
  const [status, setStatus] = useState<InsightStatus>('idle')
  const [insights, setInsights] = useState<string[]>([])

  // SOCIO-only guard
  if (userRole !== 'SOCIO') return null

  const generateInsights = async () => {
    setStatus('loading')
    try {
      const res = await fetch(`/api/projects/${projectId}/profit-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ period: 'FULL', includeAI: true }),
      })

      if (!res.ok) throw new Error('Falha ao gerar relatório')

      const report = await res.json()

      if (!report.aiInsights) {
        setStatus('degraded')
        return
      }

      // Parsear insights em bullets (separados por \n ou numeração)
      const lines: string[] = report.aiInsights
        .split(/\n+/)
        .map((l: string) => l.replace(/^[\d.]+\s*/, '').trim())
        .filter((l: string) => l.length > 10)
        .slice(0, 5)

      setInsights(lines)
      setStatus('success')

      toast.success('Insights gerados', { description: `${lines.length} insights prontos` })
    } catch {
      setStatus('degraded')
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="font-medium text-sm">Insights de IA</h3>
          <Badge variant="neutral" className="text-xs">
            <Lock className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
            SOCIO
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={generateInsights}
          disabled={status === 'loading'}
          className="gap-1.5"
          aria-label="Gerar análise de P&L com IA"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${status === 'loading' ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {status === 'idle'
            ? 'Gerar insights'
            : status === 'loading'
              ? 'Analisando...'
              : 'Atualizar'}
        </Button>
      </div>

      {status === 'degraded' && (
        <AIInsightsFallbackBanner message="Insights de IA indisponíveis no momento. Tente novamente mais tarde." />
      )}

      {status === 'idle' && (
        <p className="text-sm text-muted-foreground">
          Clique em &quot;Gerar insights&quot; para que o Claude analise os dados de P&L e
          identifique riscos, oportunidades e recomendações.
        </p>
      )}

      {status === 'loading' && (
        <div className="space-y-2" aria-busy="true" aria-label="Carregando insights">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded h-4 w-full" />
          ))}
        </div>
      )}

      {status === 'success' && insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight, idx) => (
            <div key={idx} className="flex gap-2 text-sm">
              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
              <p className="text-foreground leading-relaxed">{insight}</p>
            </div>
          ))}
          <div className="my-2 border-t" />
          <p className="text-xs text-muted-foreground">
            Baseado em: receita {currentPL.period} | custo acumulado |{' '}
            {currentPL.hoursLogged.toFixed(0)}h registradas
          </p>
        </div>
      )}
    </div>
  )
}
