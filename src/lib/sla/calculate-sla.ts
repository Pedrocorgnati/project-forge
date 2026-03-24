// src/lib/sla/calculate-sla.ts
// module-17-clientportal-approvals / TASK-2 ST001a
// Utilitários puros de cálculo de SLA — sem dependências externas
// Rastreabilidade: INT-107

import { differenceInHours, isPast } from 'date-fns'

export type SLAStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'EXPIRED'

/**
 * Retorna o status visual do SLA baseado no tempo restante.
 * HEALTHY  > 48h restantes (verde)
 * WARNING  24-48h restantes (amarelo)
 * CRITICAL < 24h restantes (vermelho)
 * EXPIRED  deadline já passou (cinza)
 */
export function getSLAStatus(slaDeadline: Date): SLAStatus {
  if (isPast(slaDeadline)) return 'EXPIRED'
  const hoursRemaining = differenceInHours(slaDeadline, new Date())
  if (hoursRemaining > 48) return 'HEALTHY'
  if (hoursRemaining > 24) return 'WARNING'
  return 'CRITICAL'
}

/**
 * Retorna o número de horas restantes (mínimo 0 — nunca negativo).
 */
export function getHoursRemaining(slaDeadline: Date): number {
  return Math.max(0, differenceInHours(slaDeadline, new Date()))
}

/**
 * Retorna true se o lembrete de 48h deve ser enviado.
 * Janela de 4h (22-26h restantes) para evitar duplicatas em re-runs do cron.
 * Ref: TASK-0/SLA Enforcement
 */
export function shouldSendReminder(slaDeadline: Date): boolean {
  const hoursRemaining = differenceInHours(slaDeadline, new Date())
  return hoursRemaining >= 22 && hoursRemaining <= 26
}
