import { z } from 'zod'
import { AlertTier } from '@prisma/client'

export const CreateChangeOrderSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().min(10).max(5000),
  impactTier: z.nativeEnum(AlertTier),
  hoursImpact: z.number().nonnegative(),
  costImpact: z.number().nonnegative(),
  scopeImpact: z.string().min(1),
  taskIds: z.array(z.string().uuid()).optional(),
})

export const ListChangeOrdersSchema = z.object({
  projectId: z.string().uuid(),
  status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED']).optional(),
})

export type CreateChangeOrderInput = z.infer<typeof CreateChangeOrderSchema>
