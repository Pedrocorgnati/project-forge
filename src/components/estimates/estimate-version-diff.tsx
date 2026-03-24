'use client'

import { formatHours } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DiffItem {
  category: string
  description: string
  hoursMin: number
  hoursMax: number
  costMin: number
  costMax: number
}

interface EstimateVersionDiffProps {
  estimateA: { version: number; totalMin: number; totalMax: number; items: DiffItem[] }
  estimateB: { version: number; totalMin: number; totalMax: number; items: DiffItem[] } | null
}

function DeltaBadge({ before, after }: { before: number; after: number }) {
  const delta = after - before
  if (Math.abs(delta) < 0.5) return <Minus className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
  return delta > 0 ? (
    <span className="inline-flex items-center gap-0.5 text-xs text-orange-600 dark:text-orange-400">
      <TrendingUp className="h-3 w-3" aria-hidden="true" />
      +{formatHours(delta)}
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
      <TrendingDown className="h-3 w-3" aria-hidden="true" />
      {formatHours(delta)}
    </span>
  )
}

export function EstimateVersionDiff({ estimateA, estimateB }: EstimateVersionDiffProps) {
  if (!estimateB) {
    return (
      <p className="text-sm text-muted-foreground">
        Selecione uma versão para comparar via parâmetro{' '}
        <code className="px-1 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded">
          ?with=estimateId
        </code>
      </p>
    )
  }

  const itemsB = new Map(estimateB.items.map((i) => [`${i.category}:${i.description}`, i]))
  const itemsAKeys = new Set(estimateA.items.map((i) => `${i.category}:${i.description}`))
  const removedItems = estimateB.items.filter((i) => !itemsAKeys.has(`${i.category}:${i.description}`))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Coluna A — atual */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-brand dark:text-brand">
          v{estimateA.version} (atual)
        </h2>
        <p className="text-sm font-bold">
          {formatHours(estimateA.totalMin)} – {formatHours(estimateA.totalMax)}
        </p>
        <div className="space-y-2">
          {estimateA.items.map((item) => {
            const bItem = itemsB.get(`${item.category}:${item.description}`)
            return (
              <div
                key={`a-${item.category}-${item.description}`}
                className={cn(
                  'rounded border p-3 space-y-1',
                  !bItem
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                    : 'border-slate-200 dark:border-slate-700',
                )}
              >
                <p className="text-xs font-medium text-muted-foreground">{item.category}</p>
                <p className="text-sm">{item.description}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span>{formatHours(item.hoursMin)} – {formatHours(item.hoursMax)}</span>
                  {bItem && <DeltaBadge before={bItem.hoursMax} after={item.hoursMax} />}
                  {!bItem && (
                    <span className="text-green-700 dark:text-green-400 text-[10px] font-semibold uppercase">
                      NOVO
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Coluna B — anterior */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          v{estimateB.version} (anterior)
        </h2>
        <p className="text-sm font-bold text-muted-foreground">
          {formatHours(estimateB.totalMin)} – {formatHours(estimateB.totalMax)}
        </p>
        <div className="space-y-2">
          {estimateB.items.map((item) => (
            <div
              key={`b-${item.category}-${item.description}`}
              className={cn(
                'rounded border p-3 space-y-1 opacity-70',
                removedItems.includes(item) && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 opacity-100',
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">{item.category}</p>
              <p className="text-sm">{item.description}</p>
              <div className="flex items-center gap-2 text-xs">
                <span>{formatHours(item.hoursMin)} – {formatHours(item.hoursMax)}</span>
                {removedItems.includes(item) && (
                  <span className="text-red-600 dark:text-red-400 text-[10px] font-semibold uppercase">
                    REMOVIDO
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
