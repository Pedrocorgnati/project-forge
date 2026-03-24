'use client'

import Link from 'next/link'
import { ROUTES } from '@/lib/constants/routes'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import { Avatar } from '@/components/ui/avatar'
import { GitBranch, CheckCircle, Archive, Loader2 } from 'lucide-react'
import type { EstimateStatus } from '@/types/estimate-ui'

interface EstimateVersionEntry {
  id: string
  version: number
  status: EstimateStatus
  totalMin: number
  totalMax: number
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
  versions?: Array<{
    reason?: string
    revisedBy: string
    createdAt: string
    changer?: { name: string; avatarUrl?: string }
  }>
}

interface EstimateVersionHistoryProps {
  estimates: EstimateVersionEntry[]
  currentEstimateId: string
  projectId: string
}

const statusIcon: Record<EstimateStatus, React.ReactNode> = {
  GENERATING: <Loader2 className="h-3 w-3 animate-spin text-blue-600" aria-hidden="true" />,
  READY: <CheckCircle className="h-3 w-3 text-green-600" aria-hidden="true" />,
  ARCHIVED: <Archive className="h-3 w-3 text-gray-400" aria-hidden="true" />,
}

export function EstimateVersionHistory({
  estimates,
  currentEstimateId,
  projectId,
}: EstimateVersionHistoryProps) {
  if (estimates.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma versão encontrada.</p>
  }

  return (
    <div className="space-y-0" aria-label="Histórico de versões">
      {estimates.map((estimate, idx) => {
        const isCurrent = estimate.id === currentEstimateId
        const versionRecord = estimate.versions?.[0]

        return (
          <div key={estimate.id} className="flex gap-3">
            {/* Linha de tempo vertical */}
            <div className="flex flex-col items-center" aria-hidden="true">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background',
                  isCurrent ? 'border-brand' : 'border-slate-200 dark:border-slate-700',
                )}
              >
                {statusIcon[estimate.status]}
              </div>
              {idx < estimates.length - 1 && (
                <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 my-1" />
              )}
            </div>

            {/* Conteúdo */}
            <div
              className={cn('flex-1 pb-6 space-y-1', idx === estimates.length - 1 && 'pb-0')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-semibold', isCurrent && 'text-brand dark:text-brand')}>
                    Versão {estimate.version}
                    {isCurrent && <span className="ml-1 text-xs font-normal">(atual)</span>}
                  </span>
                  <GitBranch className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                </div>
                <time className="text-xs text-muted-foreground" dateTime={estimate.createdAt}>
                  {formatDate(estimate.createdAt)}
                </time>
              </div>

              {estimate.status === 'READY' && (
                <p className="text-xs text-muted-foreground">
                  {estimate.totalMin}h – {estimate.totalMax}h
                </p>
              )}

              {versionRecord?.reason && (
                <p className="text-xs italic text-muted-foreground line-clamp-2">
                  &ldquo;{versionRecord.reason}&rdquo;
                </p>
              )}

              {versionRecord?.changer && (
                <div className="flex items-center gap-1.5">
                  <Avatar
                    src={versionRecord.changer.avatarUrl}
                    name={versionRecord.changer.name}
                    size="sm"
                    className="h-4 w-4"
                  />
                  <span className="text-xs text-muted-foreground">{versionRecord.changer.name}</span>
                </div>
              )}

              {!isCurrent && estimate.status === 'READY' && (
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Link
                    href={ROUTES.PROJECT_ESTIMATE_DETAIL(projectId, estimate.id)}
                    className="inline-flex items-center px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    Ver v{estimate.version}
                  </Link>
                  <Link
                    href={ROUTES.PROJECT_ESTIMATE_COMPARE_WITH(projectId, currentEstimateId, estimate.id)}
                    className="inline-flex items-center px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    Comparar com atual
                  </Link>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
