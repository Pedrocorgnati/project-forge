import { z } from 'zod'

// Espelha o enum PeriodType do Prisma schema.
// Se o enum Prisma mudar, atualizar aqui tambem.
export const periodTypeSchema = z.enum(['WEEKLY', 'MONTHLY', 'FULL'])

export const createProfitReportSchema = z.object({
  period: periodTypeSchema,
  includeAI: z.boolean().default(false),
})

export const createCheckpointSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome muito curto')
    .max(100, 'Nome muito longo')
    .default(() => `Checkpoint ${new Date().toLocaleDateString('pt-BR')}`),
})

export const checkpointCompareSchema = z.object({
  a: z.string().uuid('ID do checkpoint A inválido'),
  b: z.string().uuid('ID do checkpoint B inválido'),
})

export const timesheetExportSchema = z.object({
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  userId: z.string().uuid().optional(),
})

export type CreateProfitReportInput = z.infer<typeof createProfitReportSchema>
export type CreateCheckpointInput = z.infer<typeof createCheckpointSchema>
