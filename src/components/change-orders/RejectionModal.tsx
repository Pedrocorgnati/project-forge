// ─── REJECTION MODAL ──────────────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-2 / ST006
// Modal de rejeição com reason obrigatória e contador de caracteres
// Rastreabilidade: INT-074

'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const MIN_REASON_LENGTH = 10
const MAX_REASON_LENGTH = 1000

interface RejectionModalProps {
  changeOrderId: string
  projectId: string
  title: string
  onClose: () => void
  onRejected: () => void
}

export function RejectionModal({
  changeOrderId,
  projectId,
  title,
  onClose,
  onRejected,
}: RejectionModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const isValid = reason.trim().length >= MIN_REASON_LENGTH

  const handleReject = async () => {
    if (!isValid) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/change-orders/${changeOrderId}/reject`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      )

      if (res.ok) {
        toast.success('Change Order rejeitada')
        onRejected()
        onClose()
      } else {
        const err = await res.json()
        toast.error(err.error ?? 'Erro ao rejeitar change order')
      }
    } catch {
      toast.error('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open
      onOpenChange={open => !open && onClose()}
      variant="confirm"
      title="Rejeitar Change Order"
      description={`"${title}" — O PM será notificado com o motivo da rejeição.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            loading={loading}
            disabled={loading || !isValid}
            aria-disabled={!isValid}
          >
            {loading ? 'Rejeitando...' : 'Confirmar Rejeição'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <label
          htmlFor="rejection-reason"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Motivo da Rejeição{' '}
          <span className="text-red-500" aria-label="obrigatório">
            *
          </span>
        </label>
        <Textarea
          id="rejection-reason"
          placeholder="Explique detalhadamente o motivo da rejeição..."
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={4}
          maxLength={MAX_REASON_LENGTH}
          aria-describedby="rejection-reason-counter"
          aria-required="true"
        />
        <p
          id="rejection-reason-counter"
          className={cn(
            'text-xs',
            reason.length < MIN_REASON_LENGTH
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-green-600 dark:text-green-400',
          )}
          aria-live="polite"
        >
          {reason.length}/{MAX_REASON_LENGTH} caracteres (mínimo {MIN_REASON_LENGTH})
        </p>
      </div>

      {/* Ícone visual de contexto */}
      <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-md">
        <XCircle className="h-4 w-4 text-red-500 shrink-0" aria-hidden="true" />
        <p className="text-xs text-red-600 dark:text-red-400">
          Esta ação notificará o solicitante e a CO voltará para revisão.
        </p>
      </div>
    </Modal>
  )
}
