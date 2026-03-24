// src/app/(app)/projects/[id]/settings/costs/loading.tsx
// Skeleton loader para a pagina de custos (module-14-rentabilia-timesheet / TASK-6)

import { Skeleton } from '@/components/ui/skeleton'

export default function CostsLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton variant="custom" className="h-8 w-64" />
        <Skeleton variant="custom" className="h-4 w-96" />
      </div>

      {/* PLPreview skeleton */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <Skeleton variant="custom" className="h-6 w-40" />
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton variant="card" className="h-24" />
            <Skeleton variant="card" className="h-24" />
            <Skeleton variant="card" className="h-24" />
          </div>
        </div>
      </div>

      {/* RateConfigTable skeleton */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <Skeleton variant="custom" className="h-6 w-48" />
        </div>
        <div className="px-6 py-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-12" />
          ))}
        </div>
      </div>
    </div>
  )
}
