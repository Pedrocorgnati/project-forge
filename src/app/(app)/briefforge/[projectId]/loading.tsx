import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return <BriefforgeLoading />
}

export function BriefforgeLoading() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto" aria-busy="true" role="status">
      <span className="sr-only">Carregando briefing...</span>

      {/* Progress bar skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton variant="custom" className="h-4 w-40" />
          <Skeleton variant="custom" className="h-5 w-24" />
        </div>
        <Skeleton variant="custom" className="h-2 w-full rounded-full" />
      </div>

      {/* Chat bubble skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton variant="avatar" className="w-8 h-8" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="custom" className="h-16 w-full rounded-lg" />
          </div>
        </div>
      ))}

      {/* Input skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <Skeleton variant="custom" className="h-20 w-full rounded-md" />
        <div className="flex items-center justify-between mt-2">
          <Skeleton variant="custom" className="h-4 w-16" />
          <Skeleton variant="custom" className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  )
}
