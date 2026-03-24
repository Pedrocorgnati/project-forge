// ─── NOTIFICAÇÕES PAGE ───────────────────────────────────────────────────────
// module-20-integration / TASK-1 fix
// Server Component — RBAC: todos os roles autenticados (exceto CLIENTE via portal)

import type { Metadata } from 'next'
import { NotificationList } from '@/components/notifications/notification-list'
import { getServerUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/constants/routes'

export const metadata: Metadata = { title: 'Notificações — ProjectForge' }

export default async function NotificacoesPage() {
  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)

  return (
    <div
      data-testid="notificacoes-page"
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Notificações
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Todas as notificações do sistema
        </p>
      </div>

      <NotificationList userId={user.id} />
    </div>
  )
}
