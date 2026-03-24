'use client'

import { useNotifications } from '@/lib/hooks/use-notifications'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'

// ─── NOTIFICATION LIST ────────────────────────────────────────────────────────

interface NotificationListProps {
  userId: string
  onClose?: () => void
}

/**
 * Dropdown de notificações com estados: loading, error, empty e lista.
 * Suporta marcação individual e em lote, navegação contextual e paginação.
 */
export function NotificationList({ userId, onClose }: NotificationListProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading,
    isFetchingMore,
    isMarkingAll,
    error,
    retry,
    loadMore,
    hasMore,
  } = useNotifications(userId)
  const router = useRouter()

  if (isLoading) {
    return (
      <div
        className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-background shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label="Notificações carregando"
      >
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton variant="avatar" className="h-10 w-10" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="custom" className="h-4 w-3/4" />
                <Skeleton variant="custom" className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-background shadow-lg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-list-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 id="notification-list-title" className="font-semibold text-sm">Notificações</h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            disabled={isMarkingAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMarkingAll ? 'Marcando...' : 'Marcar todas como lidas'}
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={retry}
            className="text-xs font-medium text-primary hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Lista */}
      {!error && (
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma notificação por enquanto</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => {
                  markAsRead(notification.id)
                  const actionUrl = notification.payload?.actionUrl
                  if (actionUrl) {
                    router.push(actionUrl)
                    onClose?.()
                  }
                }}
                className={`w-full text-left p-3 hover:bg-muted border-b last:border-0 transition-colors ${
                  !notification.isRead ? 'bg-blue-50 dark:bg-blue-950' : ''
                }`}
              >
                <p className="text-sm font-medium truncate" title={notification.payload?.title ?? notification.type}>
                  {notification.payload?.title ?? notification.type}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5" title={notification.payload?.body}>
                  {(() => {
                    const body = notification.payload?.body ?? ''
                    return body.length > 80 ? body.slice(0, 80) + '...' : body
                  })()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </button>
            ))
          )}
        </div>
      )}

      {/* Footer */}
      {hasMore && !error && (
        <div className="p-2 border-t">
          <button
            onClick={loadMore}
            disabled={isFetchingMore}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingMore ? 'Carregando...' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  )
}
