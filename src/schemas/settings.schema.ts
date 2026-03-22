import { z } from 'zod'
import { UserRole } from '@prisma/client'

export const CostRateSchema = z.object({
  role: z.nativeEnum(UserRole),
  hourlyRate: z.number().positive(),
  currency: z.string().length(3).default('BRL'),
})

export const UpdateCostRatesSchema = z.object({
  rates: z.array(CostRateSchema).min(1),
})

export type UpdateCostRatesInput = z.infer<typeof UpdateCostRatesSchema>
