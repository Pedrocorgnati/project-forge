'use client'

import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { ROUTES } from '@/lib/constants/routes'

interface SessionTimeoutModalProps {
  open: boolean
}

/**
 * Modal exibido após 30 minutos de inatividade.
 * Não pode ser fechado sem re-login (ESC e clique fora desabilitados).
 */
export function SessionTimeoutModal({ open }: SessionTimeoutModalProps) {
  const router = useRouter()

  function handleLogin() {
    router.push(ROUTES.LOGIN)
  }

  return (
    <Dialog.Root open={open} onOpenChange={() => {/* bloqueado intencionalmente */}}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-expired-title"
          aria-describedby="session-expired-desc"
          onInteractOutside={(e: Event) => e.preventDefault()}
          onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <Dialog.Title
            id="session-expired-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-50"
          >
            Sua sessão expirou
          </Dialog.Title>
          <Dialog.Description
            id="session-expired-desc"
            className="mt-2 text-sm text-slate-500 dark:text-slate-400"
          >
            Por segurança, sua sessão foi encerrada após 30 minutos de
            inatividade. Faça login novamente para continuar.
          </Dialog.Description>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleLogin}
              className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Fazer login novamente
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
