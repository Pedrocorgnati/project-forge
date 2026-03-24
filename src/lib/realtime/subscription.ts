import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Notification } from '@prisma/client'
import type { EventType, SystemEventPayload } from '@/lib/constants/events'

// ─── SUPABASE REALTIME SUBSCRIPTIONS ─────────────────────────────────────────

/**
 * Inscreve-se no canal de eventos de um projeto (filtrado por projectId).
 * **CRÍTICO:** Chamar `unsubscribe(channel)` obrigatoriamente no cleanup do useEffect.
 *
 * @param projectId - ID do projeto para filtrar eventos
 * @param onEvent - Callback chamado ao receber evento
 */
export function subscribeToProjectEvents(
  projectId: string,
  onEvent: (payload: SystemEventPayload<EventType>) => void,
): RealtimeChannel {
  const supabase = createClient()
  return supabase
    .channel(`project:${projectId}`)
    .on('broadcast', { event: 'system_event' }, ({ payload }) =>
      onEvent(payload as SystemEventPayload<EventType>),
    )
    .subscribe()
}

/**
 * Inscreve-se no canal de notificações pessoais do usuário (filtrado por userId).
 * **CRÍTICO:** Chamar `unsubscribe(channel)` obrigatoriamente no cleanup do useEffect.
 *
 * @param userId - ID do usuário para filtrar notificações
 * @param onNotification - Callback chamado ao receber notificação
 */
export function subscribeToUserNotifications(
  userId: string,
  onNotification: (notification: Notification) => void,
): RealtimeChannel {
  const supabase = createClient()
  return supabase
    .channel(`user:${userId}`)
    .on('broadcast', { event: 'notification' }, ({ payload }) =>
      onNotification(payload as Notification),
    )
    .subscribe()
}

/**
 * Cancela uma subscription de Realtime.
 * Seguro para chamar mesmo que o canal já esteja encerrado.
 *
 * @param channel - Canal retornado por subscribeToProjectEvents/subscribeToUserNotifications
 */
export async function unsubscribe(channel: RealtimeChannel): Promise<void> {
  await channel.unsubscribe()
}
