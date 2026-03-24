// ─── LOG HOURS BUTTON ───────────────────────────────────────────────────────
// module-14-rentabilia-timesheet / TASK-5
// Botão que abre o formulário de registro em um Modal

'use client'

import { useState } from 'react'
import { Button, Modal } from '@/components/ui'
import { LogHoursForm } from './LogHoursForm'
import type { TimesheetEntry } from '@/hooks/use-timesheet'

interface TaskOption {
  id: string
  title: string
}

interface LogHoursButtonProps {
  projectId: string
  userRole: string
  tasks?: TaskOption[]
  editEntry?: TimesheetEntry | null
  onOpenChange?: (open: boolean) => void
  open?: boolean
  onSuccess?: () => void
}

export function LogHoursButton({
  projectId,
  userRole,
  tasks = [],
  editEntry,
  onOpenChange,
  open: controlledOpen,
  onSuccess,
}: LogHoursButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  function handleOpenChange(value: boolean) {
    if (isControlled) {
      onOpenChange?.(value)
    } else {
      setInternalOpen(value)
    }
  }

  function handleSuccess() {
    handleOpenChange(false)
    onSuccess?.()
  }

  return (
    <>
      {!isControlled && (
        <Button
          variant="primary"
          size="md"
          onClick={() => handleOpenChange(true)}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Registrar horas
        </Button>
      )}

      <Modal
        open={isOpen}
        onOpenChange={handleOpenChange}
        variant="form"
        title={editEntry ? 'Editar registro' : 'Registrar horas'}
        description={editEntry ? 'Edite os dados do registro de horas.' : 'Preencha os dados para registrar horas no projeto.'}
      >
        <LogHoursForm
          projectId={projectId}
          userRole={userRole}
          tasks={tasks}
          editEntry={editEntry}
          onSuccess={handleSuccess}
          onCancel={() => handleOpenChange(false)}
        />
      </Modal>
    </>
  )
}
