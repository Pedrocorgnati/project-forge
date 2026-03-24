// ─── CHANGE ORDER ZOD SCHEMAS ─────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-1
// Rastreabilidade: INT-072

import { z } from 'zod'

export const CreateChangeOrderSchema = z.object({
  projectId: z.string().uuid('projectId deve ser um UUID válido'),
  title: z.string().min(1, 'Título obrigatório').max(200, 'Título máximo 200 caracteres'),
  description: z.string().min(10, 'Descrição deve ter ao menos 10 caracteres').max(2000),
  impactHours: z.number().positive('Horas de impacto devem ser positivas'),
  affectedTaskIds: z.array(z.string().uuid()).default([]),
})

export const UpdateChangeOrderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(2000).optional(),
  impactHours: z.number().positive().optional(),
  affectedTaskIds: z.array(z.string().uuid()).optional(),
})

export const RejectChangeOrderSchema = z.object({
  reason: z.string().min(10, 'Motivo deve ter ao menos 10 caracteres').max(1000),
})

export type CreateChangeOrderInput = z.infer<typeof CreateChangeOrderSchema>
export type UpdateChangeOrderInput = z.infer<typeof UpdateChangeOrderSchema>
export type RejectChangeOrderInput = z.infer<typeof RejectChangeOrderSchema>
