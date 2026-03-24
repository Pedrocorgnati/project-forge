import { z } from 'zod'
import { UserRole } from '@prisma/client'

export const CreateTimesheetEntrySchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  hours: z
    .number()
    .positive('Horas devem ser maior que zero')
    .max(24, 'Máximo 24 horas por entrada')
    .refine((v) => v % 0.25 === 0, 'Horas devem ser múltiplo de 0.25'),
  role: z.nativeEnum(UserRole),
  workDate: z.string().date(), // YYYY-MM-DD
  description: z.string().min(3, 'Descrição muito curta').max(500).optional(),
  notes: z.string().max(1000).optional(),
  billable: z.boolean().default(true),
})

export const PatchTimesheetEntrySchema = z
  .object({
    hours: z
      .number()
      .positive('Horas devem ser maior que zero')
      .max(24, 'Máximo 24 horas por entrada')
      .refine((v) => v % 0.25 === 0, 'Horas devem ser múltiplo de 0.25')
      .optional(),
    description: z.string().min(3).max(500).optional(),
    notes: z.string().max(1000).optional(),
    billable: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).some((k) => d[k as keyof typeof d] !== undefined), {
    message: 'Pelo menos um campo deve ser fornecido',
  })

export const ListTimesheetSchema = z.object({
  projectId: z.string().uuid(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  week: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

export type CreateTimesheetEntryInput = z.infer<typeof CreateTimesheetEntrySchema>
export type PatchTimesheetEntryInput = z.infer<typeof PatchTimesheetEntrySchema>
export type ListTimesheetInput = z.infer<typeof ListTimesheetSchema>
