// src/app/(app)/projects/[id]/timesheet/loading.tsx
// Skeleton loader for the Timesheet page (module-14 / TASK-5)

import { Skeleton } from '@/components/ui'

export default function TimesheetLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="custom" className="h-7 w-40" />
          <Skeleton variant="custom" className="h-4 w-56" />
        </div>
        <Skeleton variant="custom" className="h-10 w-36 rounded-md" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-20" />
        ))}
      </div>

      {/* Week navigation skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton variant="custom" className="h-8 w-24" />
        <Skeleton variant="custom" className="h-4 w-48" />
        <Skeleton variant="custom" className="h-4 w-20" />
      </div>

      {/* Day grid skeleton */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-32" />
        ))}
      </div>
    </div>
  )
}
