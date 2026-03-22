import { z } from 'zod'
import { ProjectStatus, UserRole } from '@prisma/client'

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  currency: z.string().length(3).default('BRL'),
})

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  revenue: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
})

export const AddProjectMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(UserRole),
})

export const ListProjectsSchema = z.object({
  status: z.nativeEnum(ProjectStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>
export type AddProjectMemberInput = z.infer<typeof AddProjectMemberSchema>
export type ListProjectsInput = z.infer<typeof ListProjectsSchema>
