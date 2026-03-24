# Hardcodes Task — Project Forge

**Data:** 2026-03-23
**Status:** IN_PROGRESS

---

## Resumo da Análise (Phase 1)

### Infraestrutura de constantes existente ✅

Pasta `src/lib/constants/` já existe com:
- `routes.ts` — ROUTES object
- `api-routes.ts` — API object
- `messages.ts` — MESSAGES object
- `timing.ts` — TIMING object
- `query-keys.ts` — queryKeys + QUERY_KEYS
- `enums.ts` — deprecated (fonte canônica: @prisma/client)
- `index.ts` — barrel export

**Problema principal:** as constantes existem mas não são usadas pela maioria dos arquivos.

---

## Hardcodes Encontrados

### 1. Role comparisons com string literal (11 arquivos) — HIGH
Deveriam usar `UserRole` do `@prisma/client`, não `=== 'CLIENTE'`.

| Arquivo | Ocorrência |
|---------|-----------|
| `src/types/guards.ts` | `isSocio/isPM/isDev/isCliente` usam strings literais |
| `src/app/(auth)/mfa/setup/page.tsx` | `user?.role === 'CLIENTE'` |
| `src/app/api/projects/[id]/scope-baseline/[baselineId]/route.ts` | `user.role === 'CLIENTE'` |
| `src/app/(app)/projects/[id]/handoff/qa/page.tsx` | `user.role === 'CLIENTE'` |
| `src/app/(app)/projects/[id]/handoff/page.tsx` | `user.role === 'CLIENTE'` |
| `src/app/(app)/projects/[id]/estimates/[estimateId]/compare/page.tsx` | `user.role === 'CLIENTE'` |
| `src/app/(app)/projects/[id]/estimates/[estimateId]/page.tsx` | `user.role === 'CLIENTE'` |
| `src/app/(app)/projects/[id]/estimates/page.tsx` | `user.role === 'CLIENTE'` |
| `src/app/(dashboard)/layout.tsx` | `user.role === 'CLIENTE'` |
| `src/app/projects/[id]/approvals/[approvalId]/page.tsx` | `user.role === 'SOCIO'` |
| `src/components/cost-config/RateConfigTable.tsx` | role comparisons |

### 2. Role arrays hardcoded — HIGH
`['PM', 'SOCIO'].includes(...)` em 4 arquivos:
- `src/app/(app)/projects/[id]/timesheet/page.tsx`
- `src/app/(app)/projects/[id]/board/page.tsx`
- `src/components/scope-alerts/ScopeAlertCard.tsx`
- `src/components/board/TaskEditForm.tsx`

### 3. Redirects/router.push hardcoded (23 arquivos) — HIGH
ROUTES existe mas não é importado. ~40 ocorrências.

Rotas usadas:
- `/login` — 22 redirect + N push
- `/dashboard` — 8 redirect + N push
- `/projects` — 5 redirect
- `/portal` — 5 redirect + N push
- `/portal/approvals` — 2 redirect + 2 push
- `/portal/dashboard` — 1 redirect + 1 push

Rotas faltando no ROUTES:
- `PORTAL_APPROVALS_LIST: '/portal/approvals'`
- `PORTAL_CLIENT_DASHBOARD: '/portal/dashboard'`

### 4. API fetch URLs hardcoded — MEDIUM
API exists but not used in 5 fetch calls:
- `fetch('/api/auth/invite/accept', ...)` — faltando em API_ROUTES
- `fetch('/api/portal/feedback', ...)` — faltando em API_ROUTES
- `fetch('/api/auth/me')` → `API.AUTH.ME`
- `fetch('/api/auth/logout', ...)` → `API.AUTH.LOGOUT`
- `fetch('/api/health/ai', ...)` — faltando em API_ROUTES

### 5. Toast messages inline (76 ocorrências) — MEDIUM
MESSAGES existe mas só é usado em `use-ai.ts`. Os toasts mais críticos e repetitivos:
- Erros de conexão/rede → `MESSAGES.ERROR.NETWORK`
- Erros genéricos → `MESSAGES.ERROR.GENERIC`
- Mensagens de sucesso simples → `MESSAGES.SUCCESS.SAVED`
- Mensagens context-específicas → manter inline (aceitável)

### 6. Timeouts sem TIMING — LOW
- `setTimeout(..., 2000)` — sem constante TIMING
- `setTimeout(..., 1500)` — sem constante TIMING
- `setTimeout(..., 400)` — sem constante TIMING

### 7. localStorage sem STORAGE_KEYS — LOW
- `degraded-${module}` em `src/components/ui/degraded-banner.tsx`

---

## Tasks

### T001 — Adicionar rotas faltando no ROUTES
**Prioridade:** HIGH | **Dependências:** none
**Arquivo:** `src/lib/constants/routes.ts`
- Adicionar `PORTAL_APPROVALS_LIST: '/portal/approvals'`
- Adicionar `PORTAL_CLIENT_DASHBOARD: '/portal/dashboard'`

### T002 — Adicionar API routes faltando
**Prioridade:** MEDIUM | **Dependências:** none
**Arquivo:** `src/lib/constants/api-routes.ts`
- Adicionar `AUTH.INVITE_ACCEPT: '/api/auth/invite/accept'`
- Adicionar `PORTAL_FEEDBACK: '/api/portal/feedback'`
- Adicionar `HEALTH_AI: '/api/health/ai'`

### T003 — Fix guards.ts: usar UserRole do Prisma
**Prioridade:** HIGH | **Dependências:** none
**Arquivo:** `src/types/guards.ts`
- Importar `UserRole` de `@prisma/client`
- Usar `UserRole.SOCIO`, `UserRole.PM`, `UserRole.DEV`, `UserRole.CLIENTE`

### T004 — Fix role arrays hardcoded
**Prioridade:** HIGH | **Dependências:** T003
**Arquivos:** timesheet/page.tsx, board/page.tsx, ScopeAlertCard.tsx, TaskEditForm.tsx
- Substituir `['PM', 'SOCIO']` por `[UserRole.PM, UserRole.SOCIO]`

### T005 — Fix role comparisons em pages/layouts
**Prioridade:** HIGH | **Dependências:** none
**Arquivos:** 11 arquivos identificados acima
- Importar `UserRole` de `@prisma/client`
- Substituir `=== 'CLIENTE'` por `=== UserRole.CLIENTE`

### T006 — Fix redirects/router.push com ROUTES
**Prioridade:** HIGH | **Dependências:** T001
**Arquivos:** 23 arquivos identificados acima
- Importar `ROUTES` de `@/lib/constants/routes`
- Substituir strings literais por `ROUTES.LOGIN`, `ROUTES.DASHBOARD`, etc.

### T007 — Fix fetch URLs com API constants
**Prioridade:** MEDIUM | **Dependências:** T002
**Arquivos:** InviteRegisterForm.tsx, ClientFeedbackForm.tsx, use-auth.ts, use-scope-validation-status.ts
- Importar `API` de `@/lib/constants/api-routes`
- Substituir strings literais pelas constantes

### T008 — Adicionar TIMING faltando + usar em timeouts
**Prioridade:** LOW | **Dependências:** none
**Arquivo:** `src/lib/constants/timing.ts`
- Adicionar `COPIED_FEEDBACK_MS: 1_500`, `REFRESH_DELAY_MS: 1_500`, `FOCUS_DELAY_MS: 50`, `FORM_FEEDBACK_MS: 400`
- Usar constantes em arquivos com setTimeout hardcoded

### T009 — Adicionar STORAGE_KEYS
**Prioridade:** LOW | **Dependências:** none
**Arquivo:** criar `src/lib/constants/storage-keys.ts`
- Adicionar chave `DEGRADED_FLAG: (module: string) => \`degraded-\${module}\``
- Atualizar barrel index.ts

---

## Status de Execução

- [ ] T001 — Rotas faltando no ROUTES
- [ ] T002 — API routes faltando
- [ ] T003 — Fix guards.ts
- [ ] T004 — Fix role arrays
- [ ] T005 — Fix role comparisons em pages
- [ ] T006 — Fix redirects/router.push
- [ ] T007 — Fix fetch URLs
- [ ] T008 — TIMING + timeouts
- [ ] T009 — STORAGE_KEYS
