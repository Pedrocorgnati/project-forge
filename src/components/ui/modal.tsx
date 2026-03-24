'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { Button } from './button'

const maxWidthMap = {
  default: 'max-w-lg',
  confirm: 'max-w-sm',
  form: 'max-w-xl',
}

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: 'default' | 'confirm' | 'form'
  title: string
  description?: string
  trigger?: React.ReactNode
  footer?: React.ReactNode
  children?: React.ReactNode
}

export function Modal({ open, onOpenChange, variant = 'default', title, description, trigger, footer, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <Dialog.Content
          aria-describedby={description ? 'modal-description' : undefined}
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[calc(100%-32px)] md:w-full',
            maxWidthMap[variant],
            'bg-white dark:bg-slate-800',
            'rounded-xl shadow-lg border border-slate-200 dark:border-slate-700',
            'p-6',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'max-h-[90vh] overflow-y-auto'
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title id="modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Fechar modal"
                className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          {description && (
            <Dialog.Description id="modal-description" className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {description}
            </Dialog.Description>
          )}

          {children}

          {footer && (
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void | Promise<void>
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      variant="confirm"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
