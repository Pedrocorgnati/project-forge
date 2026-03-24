'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MIN_REASON_LENGTH = 10

interface ReviseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => Promise<void>
  isLoading?: boolean
}

export function ReviseModal({ open, onOpenChange, onConfirm, isLoading }: ReviseModalProps) {
  const [reason, setReason] = useState('')
  const isValid = reason.trim().length >= MIN_REASON_LENGTH
  const charsLeft = MIN_REASON_LENGTH - reason.trim().length

  async function handleConfirm() {
    if (!isValid || isLoading) return
    await onConfirm(reason.trim())
    setReason('')
  }

  function handleOpenChange(open: boolean) {
    if (!open && !isLoading) {
      setReason('')
    }
    onOpenChange(open)
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      variant="form"
      title="Solicitar Revisão"
      description="Uma nova estimativa será gerada pela IA. A versão atual será arquivada."
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!isValid}
            loading={isLoading}
          >
            Confirmar Revisão
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label
            htmlFor="revise-reason"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Motivo da revisão <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <textarea
            id="revise-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
            rows={4}
            placeholder="Descreva o motivo da revisão (mínimo 10 caracteres)…"
            aria-required="true"
            aria-describedby="revise-reason-hint"
            className={cn(
              'w-full rounded-md border px-3 py-2 text-sm resize-none',
              'bg-white dark:bg-slate-900',
              'border-slate-300 dark:border-slate-600',
              'text-slate-900 dark:text-slate-100',
              'placeholder:text-slate-400',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              !isValid && reason.length > 0 && 'border-red-400 dark:border-red-600',
            )}
          />
          <p
            id="revise-reason-hint"
            className={cn(
              'mt-1 text-xs',
              isValid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
            )}
          >
            {isValid
              ? '✓ Motivo válido'
              : reason.length === 0
                ? `Mínimo ${MIN_REASON_LENGTH} caracteres`
                : `Faltam ${charsLeft} caractere${charsLeft > 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-400">
          <strong>Atenção:</strong> Uma nova estimativa será gerada. A versão atual será arquivada e ficará disponível no histórico.
        </div>
      </div>
    </Modal>
  )
}
