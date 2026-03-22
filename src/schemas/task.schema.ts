import { z } from 'zod'
import { TaskStatus, ScopeResult } from '@prisma/client'

export const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  estimatedHours: z.number().positive().optional(),
  position: z.number().int().nonnegative().optional(),
})

// DEV: apenas status. PM: title, description, assignee, position. SOCIO: tudo.
export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  estimatedHours: z.number().positive().optional(),
  position: z.number().int().nonnegative().optional(),
})

export const RegisterScopeValidationSchema = z.object({
  result: z.nativeEnum(ScopeResult),
  similarityScore: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  matchedRequirements: z.array(z.string()).default([]),
})

export const ListTasksSchema = z.object({
  projectId: z.string().uuid(),
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: z.string().uuid().optional(),
})

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
export type RegisterScopeValidationInput = z.infer<typeof RegisterScopeValidationSchema>
