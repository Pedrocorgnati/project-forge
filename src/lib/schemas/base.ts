import { z } from 'zod'

export const idSchema = z.string().uuid('ID inválido')
export const emailSchema = z.string().email('Email inválido')
export const passwordSchema = z.string().min(8, 'Mínimo 8 caracteres')
export const nameSchema = z.string().min(1, 'Nome obrigatório').max(255)

export const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
})

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc')

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens')
