// ─── TIMESHEET ENTRY CARD ───────────────────────────────────────────────────
// module-14-rentabilia-timesheet / TASK-5
// Card compacto ou expandido para uma entrada de timesheet

'use client'

import { useState } from 'react'
import { differenceInDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { deleteTimeEntry } from '@/actions/rentabilia'
import { Card, CardContent, Badge, Button, ConfirmModal, toast } from '@/components/ui'
import type { TimesheetEntry } from '@/hooks/use-timesheet'

const EDIT_WINDOW_DAYS = 7

interface TimesheetEntryCardProps {
  entry: TimesheetEntry
  compact?: boolean
  onEdit?: (entry: TimesheetEntry) => void
  onDeleted?: () => void
}

export function TimesheetEntryCard({
  entry,
  compact = true,
  onEdit,
  onDeleted,
}: TimesheetEntryCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const createdAt = new Date(entry.createdAt)
  const daysSinceCreation = differenceInDays(new Date(), createdAt)
  const isEditable = daysSinceCreation <= EDIT_WINDOW_DAYS
  const editTooltip = isEditable
    ? undefined
    : `Janela de edição de ${EDIT_WINDOW_DAYS} dias expirada`

  async function handleDelete() {
    setDeleting(true)
    try {
      const result = await deleteTimeEntry(entry.id)
      if ('error' in result) {
        toast.error(typeof result.error === 'string' ? result.error : 'Erro ao excluir registro')
      } else {
        toast.success('Registro excluído')
        onDeleted?.()
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  if (compact) {
    return (
      <>
        <Card variant="interactive" className="text-sm">
          <CardContent className="py-2 px-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
                {Number(entry.hours).toFixed(1)}h
              </span>
              {entry.billable && (
                <Badge variant="success" className="text-[10px] px-1.5 py-0">$</Badge>
              )}
              {entry.description && (
                <span className="truncate text-slate-500 dark:text-slate-400" title={entry.description}>
                  {entry.description}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(entry)
                  }}
                  disabled={!isEditable}
                  title={editTooltip}
                  aria-label="Editar registro"
                  className="p-1 rounded text-slate-400 hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmOpen(true)
                }}
                disabled={!isEditable}
                title={isEditable ? 'Excluir registro' : editTooltip}
                aria-label="Excluir registro"
                className="p-1 rounded text-slate-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </CardContent>
        </Card>

        <ConfirmModal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Excluir registro"
          description={`Tem certeza que deseja excluir este registro de ${Number(entry.hours).toFixed(1)}h?`}
          onConfirm={handleDelete}
          confirmLabel="Excluir"
          destructive
          loading={deleting}
        />
      </>
    )
  }

  // Expanded mode
  const workDate = new Date(entry.workDate)

  return (
    <>
      <Card>
        <CardContent className="py-3 px-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                {Number(entry.hours).toFixed(1)}h
              </span>
              {entry.billable ? (
                <Badge variant="success">Faturável</Badge>
              ) : (
                <Badge variant="neutral">Não-faturável</Badge>
              )}
            </div>
            <span className="text-xs text-slate-400">
              {format(workDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
            </span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">{entry.user.name}</span>
            <span className="text-slate-400 mx-1">&middot;</span>
            <span className="text-slate-400">{entry.user.role}</span>
          </p>

          {entry.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{entry.description}</p>
          )}

          {entry.task && (
            <p className="text-xs text-brand">
              Task: {entry.task.title}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(entry)}
                disabled={!isEditable}
                title={editTooltip}
              >
                Editar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={!isEditable}
              title={isEditable ? undefined : editTooltip}
              className="text-red-500 hover:text-red-600"
            >
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir registro"
        description={`Tem certeza que deseja excluir este registro de ${Number(entry.hours).toFixed(1)}h?`}
        onConfirm={handleDelete}
        confirmLabel="Excluir"
        destructive
        loading={deleting}
      />
    </>
  )
}
