/**
 * Schemas Zod de validação para endpoints RAG — módulo 12
 * Expandidos em TASK-2 (indexRequestSchema) e TASK-3 (githubSyncSchema)
 */

import { z } from 'zod'

/** Schema para POST /api/projects/[id]/rag/index */
export const indexRequestSchema = z.object({
  documents: z
    .array(
      z.object({
        sourceType: z.enum(['github', 'docs', 'manual']),
        sourcePath: z.string().min(1),
        content: z.string().min(1),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
})

/** Schema para POST /api/projects/[id]/rag/github-sync */
export const githubSyncSchema = z.object({
  repoUrl: z
    .string()
    .url()
    .regex(
      /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/,
      'Deve ser uma URL válida de repositório GitHub (https://github.com/owner/repo)',
    ),
  branch: z.string().min(1).default('main'),
  autoSync: z.boolean().optional().default(false),
})

/** Schema para POST /api/projects/[id]/rag/query (Q&A) */
export const querySchema = z.object({
  query: z
    .string()
    .min(3, 'Pergunta deve ter pelo menos 3 caracteres')
    .max(1000, 'Pergunta muito longa (máximo 1000 caracteres)')
    .trim(),
})

export type IndexRequestInput = z.infer<typeof indexRequestSchema>
export type GitHubSyncInput = z.infer<typeof githubSyncSchema>
export type QueryInput = z.infer<typeof querySchema>
