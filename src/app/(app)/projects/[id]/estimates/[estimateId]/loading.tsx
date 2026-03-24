import { Skeleton } from '@/components/ui/skeleton'

export default function EstimateDetailLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
