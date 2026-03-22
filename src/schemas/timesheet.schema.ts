import { z } from 'zod'
import { UserRole } from '@prisma/client'

export const CreateTimesheetEntrySchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  hours: z.number().positive().max(24, 'Máximo 24 horas por entrada'),
  role: z.nativeEnum(UserRole),
  workDate: z.string().date(), // YYYY-MM-DD
  notes: z.string().max(1000).optional(),
})

export const ListTimesheetSchema = z.object({
  projectId: z.string().uuid(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

export type CreateTimesheetEntryInput = z.infer<typeof CreateTimesheetEntrySchema>
