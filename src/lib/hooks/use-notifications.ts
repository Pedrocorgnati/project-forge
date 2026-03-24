'use client'

import { useState, useEffect, useCallback } from 'react'
import { subscribeToUserNotifications, unsubscribe } from '@/lib/realtime/subscription'
import { api } from '@/lib/utils/api'
import { API } from '@/lib/constants/api-routes'
import type { Notification } from '@prisma/client'

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type NotificationPayload = {
  title: string
  body: string
  actionUrl?: string
  [key: string]: unknown
}

export type NotificationWithPayload = Omit<Notification, 'payload'> & {
  payload: NotificationPayload
}

interface UseNotificationsReturn {
  notifications: NotificationWithPayload[]
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  isLoading: boolean
  isFetchingMore: boolean
  isMarkingAll: boolean
  error: string | null
  retry: () => void
  loadMore: () => void
  hasMore: boolean
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

/**
 * Hook client-side para gerenciar notificações in-app.
 * Combina fetch inicial + subscription Realtime para atualizações em tempo real.
 *
 * @param userId - ID do usuário autenticado
 */
export function useNotifications(userId: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationWithPayload[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregamento inicial
  const fetchNotifications = useCallback(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    api
      .get<{ notifications: NotificationWithPayload[]; hasMore: boolean }>(API.NOTIFICATIONS)
      .then((res) => {
        if (res.data) {
          setNotifications(res.data.notifications ?? [])
          setHasMore(res.data.hasMore ?? false)
        }
        setError(null)
      })
      .catch(() => {
        setError('Não foi possível carregar as notificações.')
      })
      .finally(() => setIsLoading(false))
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const retry = useCallback(() => {
    setError(null)
    setPage(1)
    fetchNotifications()
  }, [fetchNotifications])

  // Subscription Realtime
  useEffect(() => {
    if (!userId) return

    const channel = subscribeToUserNotifications(userId, (notification) => {
      setNotifications((prev) => [notification as unknown as NotificationWithPayload, ...prev])
    })

    return () => {
      unsubscribe(channel)
    }
  }, [userId])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAsRead = useCallback(
    async (id: string) => {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
      try {
        await api.patch(`${API.NOTIFICATIONS}/${id}/read`, {})
        setError(null)
      } catch {
        // Reverter optimistic update em caso de falha
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)))
        setError('Não foi possível marcar a notificação como lida.')
      }
    },
    [],
  )

  const markAllAsRead = useCallback(async () => {
    setIsMarkingAll(true)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      await api.patch(API.NOTIFICATION_READ_ALL, {})
      setError(null)
    } catch {
      // Reverter em falha
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: false })))
      setError('Não foi possível marcar todas como lidas.')
    } finally {
      setIsMarkingAll(false)
    }
  }, [])

  const loadMore = useCallback(() => {
    if (isFetchingMore || !hasMore) return

    const nextPage = page + 1
    setIsFetchingMore(true)
    setPage(nextPage)

    api
      .get<{ notifications: NotificationWithPayload[]; hasMore: boolean }>(
        `${API.NOTIFICATIONS}?page=${nextPage}`,
      )
      .then((res) => {
        if (res.data) {
          setNotifications((prev) => [...prev, ...(res.data?.notifications ?? [])])
          setHasMore(res.data?.hasMore ?? false)
        }
      })
      .catch(() => {
        setPage(page) // reverter página em falha
        setError('Não foi possível carregar mais notificações.')
      })
      .finally(() => setIsFetchingMore(false))
  }, [page, isFetchingMore, hasMore])

  return { notifications, unreadCount, markAsRead, markAllAsRead, isLoading, isFetchingMore, isMarkingAll, error, retry, loadMore, hasMore }
}
