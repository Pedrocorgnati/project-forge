// ─── SCOPE ALERT ZOD SCHEMAS ──────────────────────────────────────────────────
// module-10-scopeshield-validation
// Rastreabilidade: INT-066, INT-068

import { z } from 'zod'

export const ScopeAlertTypeSchema = z.enum(['SCOPE_CREEP', 'OUT_OF_SCOPE', 'DUPLICATE'])

export const AlertSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH'])

export const AlertStatusSchema = z.enum(['OPEN', 'ACKNOWLEDGED', 'DISMISSED'])

export const TriggerScopeValidationSchema = z.object({
  taskId: z.string().uuid('taskId deve ser UUID válido'),
})

export const ListScopeAlertsQuerySchema = z.object({
  type: ScopeAlertTypeSchema.optional(),
  severity: AlertSeveritySchema.optional(),
  status: AlertStatusSchema.optional(),
})

export const AlertActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('acknowledge'),
  }),
  z.object({
    action: z.literal('dismiss'),
    reason: z.string().min(10, 'Justificativa deve ter ao menos 10 caracteres'),
  }),
])

export type TriggerScopeValidationInput = z.infer<typeof TriggerScopeValidationSchema>
export type ListScopeAlertsQuery = z.infer<typeof ListScopeAlertsQuerySchema>
export type AlertAction = z.infer<typeof AlertActionSchema>
