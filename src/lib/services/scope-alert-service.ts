// ─── SCOPE ALERT SERVICE ──────────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-1 / ST002
// Deduplicação, persistência e publicação de alertas de escopo.
// Rastreabilidade: INT-066, INT-067

import { prisma } from '@/lib/db'
import { EventBus } from '@/lib/events'
import { EventType } from '@/lib/constants/events'
import { ScopeValidator, type ScopeValidationInput } from './scope-validator'
import { ScopeAlertType, AlertTier } from '@prisma/client'

export class ScopeAlertService {
  private validator = new ScopeValidator()

  /**
   * Valida uma task semanticamente e cria alertas se necessário.
   * Deduplicação: mesma task + mesmo tipo (exceto DISMISSED) → atualiza, não duplica.
   * Fire-and-forget compatível: nunca propaga exceção.
   */
  async validateAndCreateAlerts(input: ScopeValidationInput): Promise<void> {
    try {
      const { result, degraded } = await this.validator.validate(input)

      if (degraded) {
        console.warn('[ScopeAlertService] Validação degradada — sem alerta criado', { taskId: input.taskId })
        return
      }

      if (!result || result.classification === 'IN_SCOPE') return

      // Deduplicação: busca alerta ativo (não DISMISSED) para taskId + type
      const existingAlert = await prisma.scopeAlert.findFirst({
        where: {
          taskId: input.taskId,
          type: result.classification as ScopeAlertType,
          status: { not: 'DISMISSED' },
        },
      })

      if (existingAlert) {
        // Atualizar rationale se mudou (re-validação manual)
        await prisma.scopeAlert.update({
          where: { id: existingAlert.id },
          data: {
            aiRationale: result.rationale,
            description: result.description,
          },
        })
        console.info('[ScopeAlertService] Alerta existente atualizado (sem evento)', { alertId: existingAlert.id })
        return
      }

      const alert = await prisma.scopeAlert.create({
        data: {
          projectId: input.projectId,
          taskId: input.taskId,
          type: result.classification as ScopeAlertType,
          severity: result.severity as AlertTier,
          description: result.description,
          aiRationale: result.rationale,
          relatedTaskId: result.relatedTaskId ?? null,
          status: 'OPEN',
        },
      })

      await EventBus.publish(
        EventType.SCOPE_ALERT_CREATED,
        input.projectId,
        {
          alertId: alert.id,
          projectId: input.projectId,
          taskId: input.taskId,
          type: alert.type,
          severity: alert.severity,
        },
        'module-10-scopeshield-validation',
      )

      console.info('[ScopeAlertService] Alerta criado e evento publicado', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
      })
    } catch (err) {
      // Nunca propagar — validação não deve bloquear o fluxo principal
      console.error('[ScopeAlertService] Erro interno — ignorado (fire-and-forget)', { error: String(err) })
    }
  }
}
