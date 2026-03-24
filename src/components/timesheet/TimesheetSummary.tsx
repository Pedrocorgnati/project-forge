// ─── TIMESHEET SUMMARY ──────────────────────────────────────────────────────
// module-14-rentabilia-timesheet / TASK-5
// 4 stat cards: semana, mês, faturável, não-faturável

'use client'

import { useTimesheetSummary } from '@/hooks/use-timesheet-summary'
import { Card, CardContent, Skeleton } from '@/components/ui'

interface TimesheetSummaryProps {
  projectId: string
  userId?: string
}

function StatCard({ label, value, suffix = 'h' }: { label: string; value: number; suffix?: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
          {value.toFixed(1)}
          <span className="text-sm font-normal text-slate-400 ml-1">{suffix}</span>
        </p>
      </CardContent>
    </Card>
  )
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="card" className="h-20" />
      ))}
    </div>
  )
}

export function TimesheetSummary({ projectId, userId }: TimesheetSummaryProps) {
  const { summary, isLoading, error } = useTimesheetSummary(projectId, userId)

  if (isLoading) return <SummarySkeleton />

  if (error || !summary) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400 py-4">
        Não foi possível carregar o resumo.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Semana" value={summary.weekHours} />
      <StatCard label="Mês" value={summary.monthHours} />
      <StatCard label="Faturável" value={summary.billableHours} />
      <StatCard label="Não-faturável" value={summary.nonBillableHours} />
    </div>
  )
}
