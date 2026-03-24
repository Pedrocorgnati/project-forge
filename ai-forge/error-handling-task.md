# Error Handling — Task List
Gerado em: 2026-03-23
Workspace: output/workspace/project-forge

---

### T001 – Substituir console.error por Sentry/logger em todos os error.tsx
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/app/error.tsx`
- modificar: `src/app/(app)/briefforge/[projectId]/error.tsx`
- modificar: `src/app/(app)/projects/[id]/profitability/error.tsx`
- modificar: `src/app/(dashboard)/projects/[id]/profitability/error.tsx`

**Descrição:** Todos os arquivos `error.tsx` de rota usam `console.error(error)` em vez de `Sentry.captureException`. Apenas `global-error.tsx` já usa Sentry corretamente. Em produção, esses erros de rota não são capturados no monitoramento. Adicionalmente, `src/app/error.tsx` nomeia o componente `GlobalError`, confundindo com o boundary raiz.

**Critérios de Aceite:**
- `useEffect` chama `Sentry.captureException(error)` (e opcionalmente `logger.error`) em todos os `error.tsx`
- Nenhum `console.error` remanescente nesses 4 arquivos
- Nome do componente em `src/app/error.tsx` corrigido para `RootError` ou `AppError`
- `error.digest` exibido na UI quando disponível (já implementado no global-error.tsx, replicar)

**Estimativa:** 30min

---

### T002 – Adicionar error.tsx em rotas críticas sem boundary granular
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- criar: `src/app/(app)/projects/[id]/board/error.tsx`
- criar: `src/app/(app)/projects/[id]/estimates/error.tsx`
- criar: `src/app/(app)/projects/[id]/estimates/[estimateId]/error.tsx`
- criar: `src/app/(app)/projects/[id]/handoff/error.tsx`
- criar: `src/app/(app)/projects/[id]/settings/costs/error.tsx`
- criar: `src/app/(app)/projects/[id]/timesheet/error.tsx`
- criar: `src/app/(dashboard)/projects/[id]/change-orders/error.tsx`
- criar: `src/app/(dashboard)/projects/[id]/scope-alerts/error.tsx`
- criar: `src/app/portal/approvals/error.tsx`
- criar: `src/app/projects/[id]/approvals/error.tsx`

**Descrição:** Essas rotas realizam `prisma.*` queries diretamente no Server Component (`page.tsx`) mas não possuem `error.tsx` específico. Sem boundary granular, qualquer exceção de DB/acesso sobe até o root `error.tsx`, perdendo contexto de rota. O componente `ErrorState` (já existente em `src/components/ui/error-state.tsx`) deve ser reutilizado.

**Critérios de Aceite:**
- Cada `error.tsx` criado como Client Component com `'use client'`
- Usa `Sentry.captureException(error)` no `useEffect`
- Reutiliza `<ErrorState>` com variante adequada (`retry` para páginas transientes, `redirect` para páginas de listagem)
- Link de retorno contextual (ex: board → `/projects/{id}`, estimates → `/projects/{id}`)
- `error.digest` exibido quando presente

**Estimativa:** 1h

---

### T003 – Substituir redirect() por notFound() quando recurso não existe
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/app/(app)/projects/[id]/board/page.tsx` (linha 73)
- modificar: `src/app/(app)/projects/[id]/handoff/page.tsx` (linha 42)

**Descrição:** Ambas as páginas fazem `prisma.project.findUnique` e, quando o projeto não é encontrado, chamam `redirect('/projects')` ou `redirect('/dashboard')`. O comportamento correto é `notFound()` — o redirect oculta que o recurso não existe, prejudicando SEO e UX. O `not-found.tsx` raiz já oferece navegação adequada.

**Critérios de Aceite:**
- `notFound()` importado de `next/navigation` em ambos os arquivos
- Substituição pontual: `redirect('/projects')` → `notFound()` e `redirect('/dashboard')` → `notFound()`
- Redirecionamentos de auth (`!user`) permanecem como `redirect('/login')`

**Estimativa:** 10min

---

### T004 – Substituir console.error por logger em API routes
**Tipo:** PARALLEL-GROUP-2
**Dependências:** none
**Arquivos (principais — excluir .bak):**
- modificar: `src/app/api/briefs/[id]/route.ts`
- modificar: `src/app/api/briefs/[id]/sessions/route.ts`
- modificar: `src/app/api/briefs/[id]/sessions/[sessionId]/route.ts`
- modificar: `src/app/api/briefs/[id]/sessions/[sessionId]/questions/route.ts`
- modificar: `src/app/api/briefs/[id]/prd/route.ts`
- modificar: `src/app/api/briefs/[id]/prd/versions/route.ts`
- modificar: `src/app/api/briefs/route.ts`
- modificar: `src/app/api/projects/[id]/tasks/route.ts`
- modificar: `src/app/api/projects/[id]/tasks/[taskId]/route.ts`
- modificar: `src/app/api/projects/[id]/change-orders/route.ts`
- modificar: `src/app/api/projects/[id]/change-orders/[coId]/route.ts`
- modificar: `src/app/api/projects/[id]/change-orders/[coId]/approve/route.ts`
- modificar: `src/app/api/projects/[id]/change-orders/[coId]/reject/route.ts`
- modificar: `src/app/api/projects/[id]/change-orders/[coId]/submit/route.ts`
- modificar: `src/app/api/projects/[id]/change-orders/impact/route.ts`
- modificar: `src/app/api/projects/[id]/scope-baseline/route.ts`
- modificar: `src/app/api/projects/[id]/scope-baseline/[baselineId]/route.ts`
- modificar: `src/app/api/projects/[id]/scope-alerts/route.ts`
- modificar: `src/app/api/projects/[id]/scope-alerts/[alertId]/route.ts`
- modificar: `src/app/api/projects/[id]/rag/status/route.ts`
- modificar: `src/app/api/projects/[id]/rag/query/route.ts`
- modificar: `src/app/api/projects/[id]/rag/index/route.ts`
- modificar: `src/app/api/projects/[id]/rag/github-sync/route.ts`
- modificar: `src/app/api/projects/[id]/estimates/route.ts`
- modificar: `src/app/api/projects/[id]/estimates/[estimateId]/route.ts`
- modificar: `src/app/api/projects/[id]/estimates/[estimateId]/revise/route.ts`
- modificar: `src/app/api/projects/[id]/approvals/route.ts`
- modificar: `src/app/api/portal/feedback/route.ts`
- modificar: `src/app/api/portal/[token]/accept/route.ts`
- modificar: `src/app/api/portal/approvals/[approvalId]/respond/route.ts`
- modificar: `src/app/api/webhooks/github/[projectId]/route.ts`
- modificar: `src/app/api/webhooks/resend/route.ts`
- modificar: `src/app/api/auth/callback/route.ts`
- modificar: `src/app/api/auth/invite/route.ts`
- modificar: `src/app/api/auth/logout/route.ts`
- modificar: `src/app/api/categories/route.ts`
- modificar: `src/app/api/events/route.ts`
- modificar: `src/app/api/scheduler/route.ts`
- modificar: `src/app/api/cron/sla-enforcer/route.ts`
- modificar: `src/app/api/cron/retry-failed-embeddings/route.ts`
- modificar: `src/app/api/cron/notification-dispatcher/route.ts`
- modificar: `src/app/api/cron/checkpoint-service/route.ts`
- modificar: `src/app/api/cron/recalculate-project-metrics/route.ts`

**Descrição:** Todos os API routes usam `console.error(...)` para logging de erros. O projeto já possui `src/lib/logger.ts` (Pino com redact de campos sensíveis, child logger por módulo). Em produção (Vercel), `console.error` vai para stdout sem estrutura, perdendo contexto de rastreabilidade. O padrão correto é `import { createLogger } from '@/lib/logger'` e `const log = createLogger('nome-do-modulo')`.

**Critérios de Aceite:**
- Cada API route usa `createLogger('modulo')` no topo do arquivo
- `console.error(...)` substituído por `log.error({ err, requestId }, 'mensagem')`
- `.catch(console.error)` em fire-and-forget substituído por `.catch(err => log.error({ err }, 'mensagem'))`
- Nenhum `console.error` remanescente nos arquivos listados (excluindo `.bak`)
- Arquivos `.bak` não são alterados

**Estimativa:** 2h

---

### T005 – Corrigir .catch(console.error) em fire-and-forget async
**Tipo:** PARALLEL-GROUP-2
**Dependências:** none
**Arquivos:**
- modificar: `src/actions/estimai.ts` (linhas 83 e 137)
- modificar: `src/app/api/projects/[id]/estimates/route.ts` (linha 73)

**Descrição:** Chamadas `EstimationEngine.generate(...).catch(console.error)` silenciam erros de geração de estimativa sem logging estruturado. Em produção, falhas silenciosas são invisíveis no monitoramento. Deve-se usar o logger.

**Critérios de Aceite:**
- `.catch(console.error)` substituído por `.catch(err => log.error({ err }, 'EstimationEngine falhou'))` com logger importado
- Nenhum novo bloco try/catch desnecessário introduzido (fire-and-forget mantido como padrão)

**Estimativa:** 10min

---

### T006 – Corrigir console.error em ErrorBoundary class component
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/components/ui/error-boundary.tsx` (linha 27)

**Descrição:** `componentDidCatch` usa `console.error('ErrorBoundary caught:', error, info)`. Em contexto de client component, não há acesso direto ao logger Pino (que é server-side). O correto é usar `Sentry.captureException(error, { extra: { componentStack: info.componentStack } })`.

**Critérios de Aceite:**
- `import * as Sentry from '@sentry/nextjs'` adicionado
- `componentDidCatch` chama `Sentry.captureException(error, { extra: { componentStack: info.componentStack } })`
- `console.error` removido

**Estimativa:** 10min

---

## Status

| Task | Status |
|------|--------|
| T001 | [x] COMPLETED |
| T002 | [x] COMPLETED |
| T003 | [x] COMPLETED |
| T004 | [x] COMPLETED |
| T005 | [x] COMPLETED |
| T006 | [x] COMPLETED |
