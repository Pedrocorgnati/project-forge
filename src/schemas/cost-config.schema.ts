import { z } from 'zod'
import { UserRole } from '@prisma/client'

export const CostConfigCreateSchema = z.object({
  projectId: z.string().uuid(),
  role: z.nativeEnum(UserRole),
  hourlyRate: z.number().positive('Tarifa deve ser positiva').max(10000),
  effectiveFrom: z.string().datetime().or(z.string().date()),
})

export const CostOverrideCreateSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid('userId inválido'),
  customRate: z.number().positive('Tarifa deve ser positiva').max(10000),
  reason: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres').max(300),
})

export type CostConfigCreateInput = z.infer<typeof CostConfigCreateSchema>
export type CostOverrideCreateInput = z.infer<typeof CostOverrideCreateSchema>
