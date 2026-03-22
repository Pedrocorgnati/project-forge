import { z } from 'zod'

const PROJECT_CATEGORIES = ['web_app', 'mobile', 'api', 'saas'] as const
const PROJECT_SIZES = ['P', 'M', 'G'] as const
const ESTIMATE_SOURCES = ['BENCHMARK', 'HISTORICAL', 'HYBRID'] as const

export const CreateEstimateSchema = z.object({
  projectId: z.string().uuid(),
  projectCategory: z.enum(PROJECT_CATEGORIES),
  projectSize: z.enum(PROJECT_SIZES),
  stackTags: z.array(z.string()).default([]),
  minHours: z.number().positive(),
  maxHours: z.number().positive(),
  bufferPercent: z.number().min(0).max(100).default(15),
  confidence: z.number().min(0).max(100),
  source: z.enum(ESTIMATE_SOURCES),
  breakdown: z.record(z.string(), z.unknown()).optional(),
})

export const ListEstimatesSchema = z.object({
  projectId: z.string().uuid(),
})

export type CreateEstimateInput = z.infer<typeof CreateEstimateSchema>
