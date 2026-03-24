'use client'

// ─── SCOPE ALERT BANNER ──────────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-3
// Rastreabilidade: INT-069

import { useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants/routes'
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useScopeAlerts } from '@/hooks/use-scope-alerts'

interface ScopeAlertBannerProps {
  projectId: string
  userRole: string
}

export function ScopeAlertBanner({ projectId, userRole }: ScopeAlertBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const { openAlerts, highCount, mediumCount, loading } = useScopeAlerts(projectId, 'OPEN')

  // Não exibir para CLIENTE, durante carregamento ou sem alertas
  if (userRole === 'CLIENTE' || loading || openAlerts.length === 0) {
    return null
  }

  const isHighSeverity = highCount > 0
  const previewAlerts = openAlerts.slice(0, 3)
  const remaining = openAlerts.length - previewAlerts.length

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        isHighSeverity
          ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
          : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
      )}
      role="region"
      aria-label="Alertas de escopo abertos"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle
            className={cn(
              'w-4 h-4 shrink-0',
              isHighSeverity ? 'text-red-500' : 'text-amber-500',
            )}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
            {openAlerts.length} alerta{openAlerts.length !== 1 ? 's' : ''} de escopo
          </span>
          <div className="flex items-center gap-1.5">
            {highCount > 0 && (
              <Badge variant="error" dot>
                {highCount} alta{highCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {mediumCount > 0 && (
              <Badge variant="warning" dot>
                {mediumCount} média{mediumCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={ROUTES.PROJECT_SCOPE_ALERTS(projectId)}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover dark:text-brand dark:hover:text-brand-hover"
          >
            Ver todos
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </Link>
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Recolher alertas' : 'Expandir alertas'}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-current/10 pt-3">
          {previewAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
            >
              <Badge
                variant={alert.severity === 'HIGH' ? 'error' : alert.severity === 'MEDIUM' ? 'warning' : 'neutral'}
                className="shrink-0 mt-0.5"
              >
                {alert.type.replace(/_/g, ' ')}
              </Badge>
              <span className="line-clamp-1">{alert.description}</span>
            </div>
          ))}
          {remaining > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              +{remaining} mais...
            </p>
          )}
        </div>
      )}
    </div>
  )
}
