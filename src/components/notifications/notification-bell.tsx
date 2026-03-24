'use client'

import { Bell } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { useDisclosure } from '@/lib/hooks/use-disclosure'
import { NotificationList } from './notification-list'
import { useAuth } from '@/lib/hooks/use-auth'

// ─── NOTIFICATION BELL ────────────────────────────────────────────────────────

/**
 * Ícone de sino com badge de notificações não lidas.
 * Clique abre/fecha a lista de notificações.
 *
 * Acessibilidade: aria-label atualizado com contagem; aria-live no badge.
 */
export function NotificationBell() {
  const { user } = useAuth()
  const { unreadCount } = useNotifications(user?.id ?? '')
  const { isOpen, toggle } = useDisclosure()

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} notificações não lidas`
            : 'Notificações'
        }
        className="relative p-2 rounded-full hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-live="polite"
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white dark:bg-red-600"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationList onClose={toggle} userId={user?.id ?? ''} />
      )}
    </div>
  )
}
