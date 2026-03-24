// src/app/(app)/projects/[id]/timesheet/timesheet-client.tsx
// Client orchestrator for the Timesheet page (module-14 / TASK-5)

'use client'

import { useState, useCallback } from 'react'
import { TimesheetSummary } from '@/components/timesheet/TimesheetSummary'
import { TimesheetWeek } from '@/components/timesheet/TimesheetWeek'
import { LogHoursButton } from '@/components/timesheet/LogHoursButton'
import { TeamMemberFilter } from '@/components/timesheet/TeamMemberFilter'
import type { TimesheetEntry } from '@/hooks/use-timesheet'

// ── ISO week util ───────────────────────────────────────────────────────────

function getCurrentISOWeek(): string {
  const d = new Date()
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

// ── Props ───────────────────────────────────────────────────────────────────

interface TimesheetPageClientProps {
  projectId: string
  projectName: string
  userRole: string
  userId: string
  canSeeAll: boolean
  members: { id: string; name: string }[]
  tasks: { id: string; title: string }[]
}

export function TimesheetPageClient({
  projectId,
  projectName,
  userRole,
  canSeeAll,
  members,
  tasks,
}: TimesheetPageClientProps) {
  const [week, setWeek] = useState(getCurrentISOWeek)
  const [filterUserId, setFilterUserId] = useState('')
  const [editEntry, setEditEntry] = useState<TimesheetEntry | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const effectiveUserId = canSeeAll ? (filterUserId || undefined) : undefined

  const handleEdit = useCallback((entry: TimesheetEntry) => {
    setEditEntry(entry)
    setModalOpen(true)
  }, [])

  const handleModalClose = useCallback((open: boolean) => {
    setModalOpen(open)
    if (!open) setEditEntry(null)
  }, [])

  const handleSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1)
    setEditEntry(null)
    setModalOpen(false)
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Timesheet</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Projeto: {projectName}</p>
        </div>
        <div className="flex items-center gap-3">
          {canSeeAll && (
            <TeamMemberFilter
              members={members}
              value={filterUserId}
              onChange={setFilterUserId}
            />
          )}
          <LogHoursButton
            projectId={projectId}
            userRole={userRole}
            tasks={tasks}
            editEntry={editEntry}
            open={modalOpen}
            onOpenChange={handleModalClose}
            onSuccess={handleSuccess}
          />
        </div>
      </div>

      {/* Summary cards */}
      <TimesheetSummary
        key={`summary-${refreshKey}-${filterUserId}`}
        projectId={projectId}
        userId={effectiveUserId}
      />

      {/* Week grid */}
      <TimesheetWeek
        key={`week-${refreshKey}-${filterUserId}`}
        projectId={projectId}
        week={week}
        onWeekChange={setWeek}
        userId={effectiveUserId}
        onEdit={handleEdit}
      />
    </div>
  )
}
