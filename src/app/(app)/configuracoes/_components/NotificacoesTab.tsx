'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { TIMING } from '@/lib/constants/timing'

export function NotificacoesTab() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)

  async function onSave() {
    await new Promise((r) => setTimeout(r, TIMING.FORM_FEEDBACK_MS))
    toast.success('Preferências de notificação salvas!')
  }

  return (
    <Card data-testid="configuracoes-notificacoes-card" variant="default">
      <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Notificações</h2>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-50">E-mail</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Receba atualizações de projetos por e-mail
            </p>
          </div>
          <button
            role="switch"
            aria-checked={emailNotifications}
            onClick={() => setEmailNotifications((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
              emailNotifications ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              emailNotifications ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Push</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Notificações no navegador
            </p>
          </div>
          <button
            role="switch"
            aria-checked={pushNotifications}
            onClick={() => setPushNotifications((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
              pushNotifications ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              pushNotifications ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" onClick={onSave}>
            Salvar preferências
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
