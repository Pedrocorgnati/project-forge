'use client'

// ─── DISMISS ALERT MODAL ─────────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-3
// Rastreabilidade: INT-069

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

interface DismissAlertModalProps {
  alertId: string
  projectId: string
  taskTitle: string
  onClose: () => void
  onDismissed: () => void
}

const MIN_CHARS = 10
const MAX_CHARS = 500

export function DismissAlertModal({
  alertId,
  projectId,
  taskTitle,
  onClose,
  onDismissed,
}: DismissAlertModalProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedLength = reason.trim().length
  const isValid = trimmedLength >= MIN_CHARS && trimmedLength <= MAX_CHARS
  const isOverLimit = trimmedLength > MAX_CHARS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/scope-alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', reason: reason.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message ?? 'Falha ao dispensar alerta')
      }

      toast.success('Alerta dispensado com sucesso')
      onDismissed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      variant="form"
      title="Dispensar Alerta"
      description={`Tarefa: ${taskTitle}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="dismiss-reason"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Justificativa <span className="text-red-500">*</span>
          </label>
          <Textarea
            id="dismiss-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explique o motivo para dispensar este alerta (mín. 10 caracteres)..."
            rows={4}
            maxLength={MAX_CHARS + 50}
            aria-describedby="dismiss-reason-help dismiss-reason-counter"
            aria-invalid={isOverLimit || (trimmedLength > 0 && trimmedLength < MIN_CHARS) ? 'true' : undefined}
            error={isOverLimit ? 'Limite de caracteres excedido' : undefined}
          />
          <div className="flex items-center justify-between mt-1.5">
            <p
              id="dismiss-reason-help"
              className="text-xs text-slate-500 dark:text-slate-400"
            >
              Mínimo {MIN_CHARS} caracteres
            </p>
            <span
              id="dismiss-reason-counter"
              className={`text-xs ${
                isOverLimit
                  ? 'text-red-500'
                  : trimmedLength >= MIN_CHARS
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-slate-400'
              }`}
            >
              {trimmedLength}/{MAX_CHARS}
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-md p-2.5"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={!isValid}
            loading={submitting}
          >
            Dispensar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
