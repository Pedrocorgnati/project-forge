import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'

const pulse = 'animate-pulse bg-slate-200 dark:bg-slate-700 rounded'

export function IndexingStatusCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className={`${pulse} h-6 w-48`} />
        <div className={`${pulse} h-5 w-24 rounded-full`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className={`${pulse} h-4 w-64`} />
          <div className={`${pulse} h-2 w-full rounded-full`} />
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className={`${pulse} h-10 w-full`} />
      </CardFooter>
    </Card>
  )
}

export function DocumentsListSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className={`${pulse} h-6 w-48`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`${pulse} h-4 w-4 rounded`} />
              <div className={`${pulse} h-4 flex-1`} />
              <div className={`${pulse} h-4 w-16 rounded-full`} />
              <div className={`${pulse} h-4 w-12`} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function GitHubSyncConfigSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`${pulse} h-5 w-5 rounded`} />
          <div className={`${pulse} h-6 w-48`} />
        </div>
        <div className={`${pulse} h-5 w-28 rounded-full`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className={`${pulse} h-4 w-32`} />
            <div className={`${pulse} h-10 w-full`} />
          </div>
          <div className="space-y-1.5">
            <div className={`${pulse} h-4 w-16`} />
            <div className={`${pulse} h-10 w-full`} />
          </div>
          <div className="flex items-center justify-between">
            <div className={`${pulse} h-4 w-40`} />
            <div className={`${pulse} h-6 w-10 rounded-full`} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className={`${pulse} h-10 w-full`} />
      </CardFooter>
    </Card>
  )
}
