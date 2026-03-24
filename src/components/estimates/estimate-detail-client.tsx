'use client'

import { useState } from 'react'
import { ConfidenceBadge } from './confidence-badge'
import { EstimateStatusBadge } from './estimate-status-badge'
import { EstimateItemTable } from './estimate-item-table'
import { RangeDisplay } from './range-display'
import { BenchmarkComparison } from './benchmark-comparison'
import { EstimateTotals } from './estimate-totals'
import { ReviseModal } from './revise-modal'
import { EstimateVersionHistory } from './estimate-version-history'
import { EstimateExportPdf } from './estimate-export-pdf'
import { EstimateExportCsv } from './estimate-export-csv'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Button } from '@/components/ui/button'
import { useBenchmarks } from '@/hooks/estimates/use-benchmarks'
import { useReviseEstimate } from '@/hooks/estimates/use-estimate-actions'
import { formatDate } from '@/lib/utils/format'
import { RefreshCw } from 'lucide-react'

import type { EstimateItemProps, EstimateStatus, ConfidenceLevel } from '@/types/estimate-ui'

interface EstimateDetail {
  id: string
  projectId: string
  version: number
  status: EstimateStatus
  totalMin: number
  totalMax: number
  currency: string
  confidence: ConfidenceLevel
  createdAt: Date | string
  items?: EstimateItemProps[]
  project?: { name: string }
  versions?: Array<{ changer?: { name: string } | null }>
  _count?: { items: number }
}

interface EstimateDetailClientProps {
  estimate: EstimateDetail
  projectId: string
  userRole: string
}

type TabKey = 'items' | 'benchmarks' | 'history'

export function EstimateDetailClient({ estimate, projectId, userRole: _userRole }: EstimateDetailClientProps) {
  const [tab, setTab] = useState<TabKey>('items')
  const [reviseOpen, setReviseOpen] = useState(false)

  const { data: benchmarks = [], isLoading: benchmarksLoading, isError: benchmarksError, refetch: refetchBenchmarks } = useBenchmarks(estimate.id)
  const { mutateAsync: revise, isPending: revising } = useReviseEstimate()

  const isReady = estimate.status === 'READY'

  async function handleRevise(reason: string) {
    await revise({ projectId, estimateId: estimate.id, reason })
    setReviseOpen(false)
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'items', label: 'Itens' },
    { key: 'benchmarks', label: 'Comparativo' },
    { key: 'history', label: 'Histórico' },
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">Estimativa v{estimate.version}</h1>
            <EstimateStatusBadge status={estimate.status} />
            {isReady && <ConfidenceBadge confidence={estimate.confidence} />}
          </div>
          <p className="text-sm text-muted-foreground">
            Criado em {formatDate(estimate.createdAt)}
            {estimate.versions?.[0]?.changer && (
              <> · por {estimate.versions[0].changer.name}</>
            )}
          </p>
        </div>

        {isReady && (
          <div className="flex gap-2 flex-wrap">
            <EstimateExportPdf estimateId={estimate.id} projectName={estimate.project?.name ?? 'projeto'} />
            <EstimateExportCsv items={estimate.items ?? []} projectName={estimate.project?.name ?? 'projeto'} version={estimate.version} />
            <PermissionGate role={['SOCIO', 'PM']}>
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw className="h-4 w-4" />}
                onClick={() => setReviseOpen(true)}
              >
                Revisar
              </Button>
            </PermissionGate>
          </div>
        )}
      </div>

      {/* Totals */}
      {isReady && (
        <EstimateTotals totalMin={estimate.totalMin} totalMax={estimate.totalMax} />
      )}

      {/* Range visual */}
      {isReady && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm font-semibold mb-3">Intervalo de horas</p>
          <RangeDisplay min={estimate.totalMin} max={estimate.totalMax} label="Total" />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-1 -mb-px" aria-label="Seções da estimativa">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-selected={tab === key}
              role="tab"
              className={
                tab === key
                  ? 'px-4 py-2 text-sm font-medium text-brand dark:text-brand border-b-2 border-brand dark:border-brand'
                  : 'px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground'
              }
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'items' && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <EstimateItemTable items={estimate.items ?? []} />
        </div>
      )}

      {tab === 'benchmarks' && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <BenchmarkComparison
            benchmarks={benchmarks}
            estimateItems={estimate.items}
            isLoading={benchmarksLoading}
            isError={benchmarksError}
            onRetry={() => refetchBenchmarks()}
          />
        </div>
      )}

      {tab === 'history' && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <EstimateVersionHistory
            estimates={[{
              ...estimate,
              createdAt: typeof estimate.createdAt === 'string' ? estimate.createdAt : estimate.createdAt.toISOString(),
              confidence: estimate.confidence as 'LOW' | 'MEDIUM' | 'HIGH',
              versions: estimate.versions?.map((v) => ({ revisedBy: '', createdAt: '', changer: v.changer ?? undefined })),
            }]}
            currentEstimateId={estimate.id}
            projectId={projectId}
          />
        </div>
      )}

      {/* Revise Modal */}
      <ReviseModal
        open={reviseOpen}
        onOpenChange={setReviseOpen}
        onConfirm={handleRevise}
        isLoading={revising}
      />
    </div>
  )
}
