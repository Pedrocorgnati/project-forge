import { prisma } from '@/lib/db'
import { NOTIFICATION_LIMITS } from '@/lib/constants/notifications'
import type { EventType } from '@/lib/constants/events'

// ─── ANTI-FADIGA DE NOTIFICAÇÕES ─────────────────────────────────────────────

/**
 * Verifica se pode enviar mais uma notificação do tipo para o userId.
 * Aplica dois limites:
 *  1. MAX_PER_TYPE_PER_5MIN — mesmo tipo, janela de COOLDOWN_MS
 *  2. MAX_PER_DAY — total do dia (qualquer tipo)
 *
 * @returns true se permitido, false se bloqueado
 */
export async function checkAntiFatigue(
  userId: string,
  type: EventType,
): Promise<boolean> {
  const since = new Date(Date.now() - NOTIFICATION_LIMITS.COOLDOWN_MS)

  // Limite por tipo em janela de 5min
  const recentSameType = await prisma.notification.count({
    where: { userId, type, createdAt: { gte: since } },
  })
  if (recentSameType >= NOTIFICATION_LIMITS.MAX_PER_TYPE_PER_5MIN) return false

  // Limite diário total
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const todayTotal = await prisma.notification.count({
    where: { userId, createdAt: { gte: startOfDay } },
  })
  if (todayTotal >= NOTIFICATION_LIMITS.MAX_PER_DAY) return false

  return true
}

/**
 * Verifica se o horário atual está dentro do quiet hours global.
 * Usa os defaults de NOTIFICATION_LIMITS (sem personalização por usuário no schema atual).
 */
export function isQuietHoursNow(): boolean {
  const hour = new Date().getHours()
  const start = NOTIFICATION_LIMITS.QUIET_HOURS_START
  const end = NOTIFICATION_LIMITS.QUIET_HOURS_END
  // Cruza meia-noite (ex: 22h–8h)
  if (start > end) return hour >= start || hour < end
  return hour >= start && hour < end
}
