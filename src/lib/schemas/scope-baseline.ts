// src/lib/schemas/scope-baseline.ts
// Schemas Zod para ScopeBaseline (module-9-scopeshield-board)
// Rastreabilidade INTAKE: INT-060

import { z } from 'zod'

export const CreateBaselineSchema = z.object({
  name:        z.string().min(1, 'Nome obrigatório').max(100, 'Nome máx 100 caracteres'),
  description: z.string().optional(),
})

export type CreateBaselineInput = z.infer<typeof CreateBaselineSchema>
