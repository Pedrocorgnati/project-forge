'use client'

import { useState } from 'react'
import { Bell, CheckCircle, AlertTriangle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Notification {
  id: string
  title: string
  body: string
  read: boolean
  createdAt: Date
  type?: 'approval' | 'scope' | 'prd' | 'default'
}

const typeIcons = {
  approval: CheckCircle,
  scope: AlertTriangle,
  prd: FileText,
  default: Bell,
}

// Stub notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'PRD aprovado — BriefForge',
    body: 'PRD "Proposta Tech Stack" foi aprovado pelo cliente.',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
    type: 'approval',
  },
  {
    id: '2',
    title: 'Alerta de Escopo — ScopeShield',
    body: 'Tarefa "Setup CI" com 30% de desvio detectado.',
    read: true,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    type: 'scope',
  },
]

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(mockNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <div data-testid="header-notification" className="relative">
      <button
        data-testid="header-notification-button"
        aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative p-2 rounded-full transition-colors duration-150',
          'text-slate-500 dark:text-slate-400',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          open && 'bg-slate-100 dark:bg-slate-800'
        )}
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            data-testid="header-notification-panel"
            className={cn(
              'absolute right-0 top-10 z-50 w-80 rounded-lg border shadow-lg',
              'bg-white dark:bg-slate-900',
              'border-slate-200 dark:border-slate-700'
            )}
            role="dialog"
            aria-label="Painel de notificações"
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-50">
                Notificações
              </span>
              {unreadCount > 0 && (
                <button
                  data-testid="header-notification-mark-all-read"
                  onClick={markAllRead}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  Marcar todas lidas
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <Bell size={32} className="text-slate-300 dark:text-slate-600 mb-3" aria-hidden="true" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma notificação por enquanto</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = typeIcons[n.type || 'default']
                  return (
                    <div
                      key={n.id}
                      data-testid={`header-notification-item-${n.id}`}
                      className={cn(
                        'p-3 border-b border-slate-100 dark:border-slate-800 last:border-0',
                        !n.read && 'bg-blue-50 dark:bg-blue-950'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Icon size={16} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{n.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{n.body}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
