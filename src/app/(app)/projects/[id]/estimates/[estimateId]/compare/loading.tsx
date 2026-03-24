import { Skeleton } from '@/components/ui/skeleton'

export default function EstimateCompareLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  )
}
