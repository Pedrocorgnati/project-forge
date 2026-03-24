# Gerenciamento de Variáveis de Ambiente — ProjectForge

> Rastreabilidade: INT-120, INT-121, INT-122, INT-123

## Ambientes

| Ambiente | URL | Banco | Sentry |
|----------|-----|-------|--------|
| development | localhost:3000 | Supabase local ou dev | Opcional |
| preview | `*.vercel.app` | Supabase staging | Sim |
| production | domínio produção | Supabase produção | Sim |

## Tabela de Variáveis

| Variável | development | preview | production | Obrigatório |
|----------|-------------|---------|------------|-------------|
| `DATABASE_URL` | `.env.local` | Vercel Secret | Vercel Secret | **Sim** |
| `DIRECT_URL` | `.env.local` | Vercel Secret | Vercel Secret | **Sim** |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Vercel Env | Vercel Env | **Sim** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Vercel Env | Vercel Env | **Sim** |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | Vercel Secret | Vercel Secret | **Sim** |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` | Vercel Env | Vercel Env | **Sim** |
| `GITHUB_WEBHOOK_SECRET` | `.env.local` | Vercel Secret | Vercel Secret | **Sim** |
| `RESEND_API_KEY` | `.env.local` | Vercel Secret | Vercel Secret | **Sim** |
| `OPENAI_API_KEY` | `.env.local` | Vercel Secret | Vercel Secret | **Sim** |
| `GITHUB_TOKEN` | `.env.local` | Vercel Secret | Vercel Secret | **Sim** |
| `SENTRY_DSN` | Opcional | Vercel Secret | Vercel Secret | Não (build passa) |
| `NEXT_PUBLIC_SENTRY_DSN` | Opcional | Vercel Env | Vercel Env | Não |
| `SENTRY_AUTH_TOKEN` | Não necessário | Não | Vercel Secret | Não |
| `SENTRY_ORG` | Não necessário | Não | Vercel Secret | Não |
| `SENTRY_PROJECT` | Não necessário | Não | Vercel Secret | Não |
| `LOG_LEVEL` | `.env.local` (debug) | — | Vercel Env (warn) | Não |
| `CRON_SECRET` | `.env.local` | Vercel Secret | Vercel Secret | **Sim** |
| `EMBEDDING_PROVIDER` | `.env.local` | Vercel Env | Vercel Env | **Sim** |

## Configuração no Vercel

### 1. Acessar o dashboard

```
vercel.com → seu projeto → Settings → Environment Variables
```

### 2. Adicionar variáveis por ambiente

```bash
# Via Vercel CLI (opcional):
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_URL  # all environments
vercel env add SENTRY_DSN production
vercel env add SENTRY_DSN preview
```

### 3. Verificar configuração

```bash
vercel env ls
# Deve mostrar cada variável com os ambientes em que está configurada
```

### 4. Baixar variáveis de preview para desenvolvimento local

```bash
vercel env pull .env.local
# Baixa as variáveis do ambiente preview para .env.local
```

## Validação em Startup (Zod)

O arquivo `src/lib/env.ts` valida as variáveis no startup da aplicação.
Se uma variável obrigatória estiver ausente, a aplicação falha com mensagem explícita:

```
Error: Invalid environment variables:
  DATABASE_URL: Required
  NEXT_PUBLIC_SUPABASE_URL: Required
```

### Diferenciação por NODE_ENV

```typescript
// src/lib/env.ts — SENTRY_DSN opcional em development, obrigatório em production
SENTRY_DSN: process.env.NODE_ENV === 'production'
  ? z.string().min(1, 'SENTRY_DSN obrigatório em produção')
  : z.string().optional()
```

## Segurança

- **NUNCA** commite `.env.local` ou `.env` — ambos estão no `.gitignore`
- **NUNCA** coloque segredos reais em `.env.example`
- Use `openssl rand -base64 32` para gerar `NEXTAUTH_SECRET`
- Use `openssl rand -hex 32` para gerar `CRON_SECRET` e `GITHUB_WEBHOOK_SECRET`
- Variáveis com prefixo `NEXT_PUBLIC_` são expostas no browser — nunca use para segredos

## Variáveis por Contexto (resumo para configuração rápida)

### development (.env.local)

```bash
DATABASE_URL=postgresql://postgres.xxxx:password@aws.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxxx:password@aws.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GITHUB_WEBHOOK_SECRET=dev-webhook-secret-min-32-chars-ok
RESEND_API_KEY=re_...
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
CRON_SECRET=dev-cron-secret-hex-32-chars-minimum
LOG_LEVEL=debug
EMBEDDING_PROVIDER=openai
```

### production (Vercel)

Configurar via dashboard. Adicionar adicionalmente:
```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=sua-org
SENTRY_PROJECT=project-forge
LOG_LEVEL=warn
```
