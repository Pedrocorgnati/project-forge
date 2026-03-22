import { LoadingSpinner } from '@/components/ui/skeleton'

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <LoadingSpinner size="lg" centered />
    </div>
  )
}
