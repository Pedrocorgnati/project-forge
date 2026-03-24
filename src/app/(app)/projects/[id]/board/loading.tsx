// src/app/(app)/projects/[id]/board/loading.tsx
// Skeleton loading para o Kanban board (module-9-scopeshield-board)

import { Skeleton } from '@/components/ui/skeleton'

const SKELETON_COLUMNS = 4
const SKELETON_CARDS_PER_COLUMN = 3

export default function BoardLoading() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton variant="custom" className="h-8 w-24" />
        <Skeleton variant="custom" className="h-4 w-48" />
      </div>

      {/* Board skeleton */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: SKELETON_COLUMNS }).map((_, colIdx) => (
          <div
            key={colIdx}
            className="flex flex-col min-w-[280px] flex-1 rounded-lg bg-slate-50 dark:bg-slate-900/50 p-2"
          >
            {/* Column header skeleton */}
            <div className="flex items-center gap-2 px-2 py-2.5">
              <Skeleton variant="custom" className="h-4 w-20" />
              <Skeleton variant="custom" className="h-5 w-5 rounded-full" />
            </div>

            {/* Card skeletons */}
            <div className="space-y-2 mt-1">
              {Array.from({ length: SKELETON_CARDS_PER_COLUMN }).map((_, cardIdx) => (
                <div
                  key={cardIdx}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-2"
                >
                  <Skeleton variant="custom" className="h-4 w-full" />
                  <Skeleton variant="custom" className="h-3 w-3/4" />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Skeleton variant="custom" className="h-4 w-8 rounded" />
                      <Skeleton variant="custom" className="h-3 w-12" />
                    </div>
                    <Skeleton variant="avatar" className="w-6 h-6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
