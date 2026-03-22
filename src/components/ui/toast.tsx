'use client'

import { Toaster as SonnerToaster, toast as sonnerToast, type ExternalToast } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'bg-slate-800 border border-slate-700 text-slate-50 shadow-lg rounded-lg',
          title: 'text-sm font-medium text-slate-50',
          description: 'text-xs text-slate-400',
          actionButton: 'bg-indigo-500 text-white text-xs rounded px-2 py-1',
          cancelButton: 'bg-slate-700 text-slate-300 text-xs rounded px-2 py-1',
          closeButton: 'text-slate-400 hover:text-slate-200',
        },
      }}
    />
  )
}

export const toast = {
  success: (message: string, opts?: ExternalToast) => sonnerToast.success(message, { duration: 4000, ...opts }),
  error: (message: string, opts?: ExternalToast) => sonnerToast.error(message, { duration: 6000, ...opts }),
  loading: (message: string, opts?: ExternalToast) => sonnerToast.loading(message, opts),
  info: (message: string, opts?: ExternalToast) => sonnerToast.info(message, { duration: 4000, ...opts }),
  warning: (message: string, opts?: ExternalToast) => sonnerToast.warning(message, { duration: 5000, ...opts }),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
}
