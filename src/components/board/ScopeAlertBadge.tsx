'use client'

// ─── SCOPE ALERT BADGE ────────────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-3
// Rastreabilidade: INT-069

import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScopeAlertBadgeProps {
  severity?: 'LOW' | 'MEDIUM' | 'HIGH'
}

const severityConfig = {
  HIGH: {
    color: 'text-red-500 dark:text-red-400',
    label: 'Alerta de escopo: alta severidade',
    tooltip: 'Severidade alta',
  },
  MEDIUM: {
    color: 'text-amber-500 dark:text-amber-400',
    label: 'Alerta de escopo: média severidade',
    tooltip: 'Severidade média',
  },
  LOW: {
    color: 'text-green-600 dark:text-green-400',
    label: 'Alerta de escopo: baixa severidade',
    tooltip: 'Severidade baixa',
  },
} as const

export function ScopeAlertBadge({ severity }: ScopeAlertBadgeProps) {
  if (!severity) return null

  const config = severityConfig[severity]

  return (
    <span
      className={cn('inline-flex items-center', config.color)}
      aria-label={config.label}
      title={config.tooltip}
    >
      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
    </span>
  )
}
