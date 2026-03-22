import { z } from 'zod'

export const StartIndexationSchema = z.object({
  projectId: z.string().uuid(),
  githubRepoUrl: z.string().url(),
  githubOwner: z.string().min(1).max(100),
  githubRepo: z.string().min(1).max(100),
  indexedExtensions: z.array(z.string()).default(['.ts', '.tsx', '.js', '.py', '.md']),
})

export const UpdateIndexStatusSchema = z.object({
  indexationStatus: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETE', 'FAILED']),
  lastCommitSha: z.string().length(40).optional(),
  totalChunks: z.number().int().nonnegative().optional(),
})

export const InsertEmbeddingsSchema = z.object({
  ragIndexId: z.string().uuid(),
  chunks: z.array(
    z.object({
      chunkText: z.string().max(2048),
      embedding: z.array(z.number()).length(384),
      filePath: z.string(),
      commitSha: z.string().length(40),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  ).max(50),
})

export const QueryEmbeddingsSchema = z.object({
  projectId: z.string().uuid(),
  query: z.string().min(1).max(1000),
  limit: z.coerce.number().int().positive().max(20).default(5),
})

export type StartIndexationInput = z.infer<typeof StartIndexationSchema>
export type InsertEmbeddingsInput = z.infer<typeof InsertEmbeddingsSchema>
export type QueryEmbeddingsInput = z.infer<typeof QueryEmbeddingsSchema>
