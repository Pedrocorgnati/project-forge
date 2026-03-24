'use client'

import { useState, useEffect } from 'react'
import { History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { API } from '@/lib/constants/api-routes'
import { formatDateTime } from '@/lib/utils/format'
import type { PRDDocument } from '@/types/briefforge'

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  READY: { label: 'Pronto', variant: 'success' },
  GENERATING: { label: 'Gerando', variant: 'warning' },
  ERROR: { label: 'Erro', variant: 'error' },
}

interface PRDVersionHistoryProps {
  briefId: string
  currentVersion: number
  onVersionSelect?: (version: number) => void
}

export function PRDVersionHistory({
  briefId,
  currentVersion,
  onVersionSelect,
}: PRDVersionHistoryProps) {
  const [versions, setVersions] = useState<Omit<PRDDocument, 'content'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchVersions() {
      try {
        const res = await fetch(API.BRIEF_PRD_VERSIONS(briefId))

        if (res.status === 403) {
          // PermissionGate no parent ja trata — nao renderizar
          setVersions([])
          return
        }

        if (!res.ok) {
          setError(true)
          return
        }

        const body = await res.json()
        setVersions(body.data ?? [])
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchVersions()
  }, [briefId])

  if (error) return null

  // Apenas a versao atual — nao mostrar historico
  if (!loading && versions.length <= 1) {
    return null
  }

  return (
    <details
      data-testid="prd-version-history"
      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
    >
      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
        <History size={16} className="text-slate-400" aria-hidden="true" />
        Historico de versoes ({versions.length})
      </summary>

      <div className="px-4 pb-3 space-y-2">
        {loading ? (
          <div className="py-2">
            <Skeleton variant="text" lines={3} />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {versions.map((v) => {
              const isCurrent = v.version === currentVersion
              const statusInfo = statusLabels[v.status] ?? {
                label: v.status,
                variant: 'warning' as const,
              }

              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => onVersionSelect?.(v.version)}
                    disabled={isCurrent || !onVersionSelect}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-left text-sm transition-colors ${
                      isCurrent
                        ? 'bg-accent bg-brand-light dark:bg-brand/10 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    } ${
                      !onVersionSelect
                        ? 'cursor-default'
                        : isCurrent
                          ? 'cursor-default'
                          : 'cursor-pointer'
                    }`}
                    data-testid={`prd-version-${v.version}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 dark:text-slate-100">
                        Versao {v.version}
                      </span>
                      <Badge
                        variant={statusInfo.variant}
                        dot
                      >
                        {statusInfo.label}
                      </Badge>
                      {isCurrent && (
                        <span className="text-xs text-brand dark:text-brand">
                          (atual)
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDateTime(v.createdAt)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </details>
  )
}
