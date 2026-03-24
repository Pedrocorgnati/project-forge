// src/lib/schemas/task.ts
// Schemas Zod para Task e operações de board (module-9-scopeshield-board)
// Rastreabilidade INTAKE: INT-060

import { z } from 'zod'

export const CreateTaskSchema = z.object({
  title:          z.string().min(1, 'Título obrigatório').max(200, 'Título máx 200 caracteres'),
  description:    z.string().optional(),
  assigneeId:     z.string().uuid('assigneeId deve ser UUID').optional(),
  estimatedHours: z.number().positive().optional(),
  priority:       z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  labels:         z.array(z.string()).default([]),
  dueDate:        z.string().datetime().optional(),
})

export const UpdateTaskSchema = z.object({
  title:          z.string().min(1).max(200).optional(),
  description:    z.string().optional(),
  status:         z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  assigneeId:     z.string().uuid().nullable().optional(),
  estimatedHours: z.number().positive().optional(),
  actualHours:    z.number().min(0).optional(),
  priority:       z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  labels:         z.array(z.string()).optional(),
  dueDate:        z.string().datetime().nullable().optional(),
  position:       z.number().int().min(0).optional(),
})

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
