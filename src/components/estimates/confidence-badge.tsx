'use client'

import { cn } from '@/lib/utils'
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react'
import type { ConfidenceLevel } from '@/types/estimate-ui'

const CONFIDENCE_CONFIG: Record<
  ConfidenceLevel,
  {
    label: string
    icon: React.ElementType
    className: string
    tooltip: string
  }
> = {
  HIGH: {
    label: 'Alta',
    icon: CheckCircle,
    className: 'text-[var(--confidence-high)] bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800',
    tooltip: 'Alta confiança: brief detalhado, histórico de projetos similares e margem de risco baixa.',
  },
  MEDIUM: {
    label: 'Média',
    icon: AlertTriangle,
    className: 'text-[var(--confidence-medium)] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800',
    tooltip: 'Confiança média: algumas incertezas no escopo ou dependências externas a definir.',
  },
  LOW: {
    label: 'Baixa',
    icon: AlertCircle,
    className: 'text-[var(--confidence-low)] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800',
    tooltip: 'Baixa confiança: brief incompleto, muitas incertezas ou escopo muito amplo. Recomenda-se refinar o brief.',
  },
}

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel
  className?: string
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const config = CONFIDENCE_CONFIG[confidence]
  const Icon = config.icon

  return (
    <span
      role="img"
      aria-label={`Confiança da estimativa: ${config.label}`}
      title={config.tooltip}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  )
}
