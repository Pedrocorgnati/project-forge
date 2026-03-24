import { z } from 'zod'

const envSchema = z.object({
  // Supabase (obrigatório)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ message: '[env] NEXT_PUBLIC_SUPABASE_URL é obrigatória' })
    .url('[env] NEXT_PUBLIC_SUPABASE_URL deve ser uma URL válida'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ message: '[env] NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatória' })
    .min(1, '[env] NEXT_PUBLIC_SUPABASE_ANON_KEY não pode ser vazia'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ message: '[env] SUPABASE_SERVICE_ROLE_KEY é obrigatória' })
    .min(1, '[env] SUPABASE_SERVICE_ROLE_KEY não pode ser vazia'),
  // Site URL (usado no OAuth callback)
  NEXT_PUBLIC_SITE_URL: z
    .string({ message: '[env] NEXT_PUBLIC_SITE_URL é obrigatória' })
    .url('[env] NEXT_PUBLIC_SITE_URL deve ser uma URL válida'),
  // Database
  DATABASE_URL: z
    .string({ message: '[env] DATABASE_URL é obrigatória' })
    .min(1, '[env] DATABASE_URL não pode ser vazia'),
  // Email (Resend) — opcional em desenvolvimento
  RESEND_API_KEY: z.string().optional(),
  // RAG / HandoffAI — módulo 12
  EMBEDDING_PROVIDER: z.enum(['openai']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().min(1, '[env] GITHUB_TOKEN é obrigatória para GitHub sync').optional(),
  // Node
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

const _parsed = envSchema.safeParse(process.env)

if (!_parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:', _parsed.error.flatten().fieldErrors)
  throw new Error('Configuração de ambiente inválida. Verifique o .env.local')
}

export const env = _parsed.data
