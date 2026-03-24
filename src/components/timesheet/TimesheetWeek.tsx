// ─── TIMESHEET WEEK ─────────────────────────────────────────────────────────
// module-14-rentabilia-timesheet / TASK-5
// Grid semanal com navegação prev/next e cards por dia

'use client'

import { useMemo } from 'react'
import { format, addDays, isSameDay, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTimesheet } from '@/hooks/use-timesheet'
import { TimesheetEntryCard } from './TimesheetEntryCard'
import { Button, Skeleton, EmptyState } from '@/components/ui'
import type { TimesheetEntry } from '@/hooks/use-timesheet'

// ── ISO week utilities ──────────────────────────────────────────────────────

function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getISOWeekStart(weekStr: string): Date {
  const [yearStr, weekPart] = weekStr.split('-W')
  const year = Number(yearStr)
  const week = Number(weekPart)
  const jan4 = new Date(year, 0, 4)
  const startOfYear = new Date(jan4)
  startOfYear.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const start = new Date(startOfYear)
  start.setDate(start.getDate() + (week - 1) * 7)
  return start
}

function shiftWeek(weekStr: string, delta: number): string {
  const start = getISOWeekStart(weekStr)
  const shifted = addDays(start, delta * 7)
  return getISOWeekString(shifted)
}

// ── Component ───────────────────────────────────────────────────────────────

interface TimesheetWeekProps {
  projectId: string
  week: string
  onWeekChange: (week: string) => void
  userId?: string
  onEdit?: (entry: TimesheetEntry) => void
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function TimesheetWeek({
  projectId,
  week,
  onWeekChange,
  userId,
  onEdit,
}: TimesheetWeekProps) {
  const { entries, isLoading, refetch } = useTimesheet(projectId, week, userId)

  const weekStart = useMemo(() => getISOWeekStart(week), [week])
  const currentWeek = getISOWeekString(new Date())
  const isFutureWeek = week > currentWeek

  // Group entries by day (0=Mon .. 6=Sun)
  const dayEntries = useMemo(() => {
    const grouped: TimesheetEntry[][] = Array.from({ length: 7 }, () => [])
    for (const entry of entries) {
      const entryDate = new Date(entry.workDate)
      for (let i = 0; i < 7; i++) {
        const dayDate = addDays(weekStart, i)
        if (isSameDay(entryDate, dayDate)) {
          grouped[i].push(entry)
          break
        }
      }
    }
    return grouped
  }, [entries, weekStart])

  // Total hours per day
  const dayTotals = useMemo(
    () => dayEntries.map((dayList) => dayList.reduce((sum, e) => sum + Number(e.hours), 0)),
    [dayEntries],
  )

  const weekTotal = dayTotals.reduce((a, b) => a + b, 0)

  function handlePrev() {
    onWeekChange(shiftWeek(week, -1))
  }

  function handleNext() {
    if (!isFutureWeek) {
      onWeekChange(shiftWeek(week, 1))
    }
  }

  function handleToday() {
    onWeekChange(currentWeek)
  }

  // Parse week label
  const weekEndDate = addDays(weekStart, 6)
  const weekLabel = `${format(weekStart, "dd 'de' MMM", { locale: ptBR })} — ${format(weekEndDate, "dd 'de' MMM, yyyy", { locale: ptBR })}`

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handlePrev} aria-label="Semana anterior">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNext} disabled={isFutureWeek} aria-label="Próxima semana">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Button>
          {week !== currentWeek && (
            <Button variant="outline" size="sm" onClick={handleToday}>
              Hoje
            </Button>
          )}
        </div>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {weekLabel}
          <span className="ml-2 text-xs text-slate-400">({week})</span>
        </div>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
          Total: {weekTotal.toFixed(1)}h
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-32" />
          ))}
        </div>
      )}

      {/* Day grid */}
      {!isLoading && (
        <div className="grid grid-cols-7 gap-2">
          {DAY_LABELS.map((label, dayIndex) => {
            const dayDate = addDays(weekStart, dayIndex)
            const isCurrentDay = isToday(dayDate)
            const dayList = dayEntries[dayIndex]
            const total = dayTotals[dayIndex]

            return (
              <div
                key={dayIndex}
                className={`rounded-lg border p-2 min-h-[120px] flex flex-col ${
                  isCurrentDay
                    ? 'border-brand/40 bg-brand-light/50 dark:border-brand/50 dark:bg-brand/10'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Day header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {label}
                    </span>
                    <span className={`ml-1 text-xs ${isCurrentDay ? 'text-brand dark:text-brand font-bold' : 'text-slate-400'}`}>
                      {format(dayDate, 'dd')}
                    </span>
                  </div>
                  {total > 0 && (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      {total.toFixed(1)}h
                    </span>
                  )}
                </div>

                {/* Entry cards */}
                <div className="flex-1 space-y-1">
                  {dayList.map((entry) => (
                    <TimesheetEntryCard
                      key={entry.id}
                      entry={entry}
                      compact
                      onEdit={onEdit}
                      onDeleted={refetch}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <EmptyState
          title="Nenhum registro nesta semana"
          description="Use o botão 'Registrar horas' para adicionar entradas."
        />
      )}
    </div>
  )
}
