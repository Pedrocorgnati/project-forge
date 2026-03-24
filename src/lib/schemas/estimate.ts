import { z } from 'zod'

// ─── SCHEMAS ZOD — EstimaAI ────────────────────────────────────────────────────

export const CreateEstimateSchema = z.object({})

export const ReviseEstimateSchema = z.object({
  reason: z.string().min(10, 'Motivo da revisão requer mínimo de 10 caracteres'),
})

export const EstimateFilterSchema = z.object({
  status: z.enum(['GENERATING', 'READY', 'ARCHIVED']).optional(),
  version: z.coerce.number().int().positive().optional(),
})

export type CreateEstimateInput = z.infer<typeof CreateEstimateSchema>
export type ReviseEstimateInput = z.infer<typeof ReviseEstimateSchema>
export type EstimateFilterInput = z.infer<typeof EstimateFilterSchema>
