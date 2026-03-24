# Hardcodes Report — ProjectForge

**Auditoria:** `/nextjs:hardcodes`
**Config:** `.claude/projects/project-forge.json`
**Workspace:** `output/workspace/project-forge/src`

---

## Resumo Executivo

| Tipo | Encontrados | Corrigidos |
|------|-------------|------------|
| Roles/Status hardcoded | 18 | 18 |
| Rotas de navegação hardcoded | 22 | 22 |
| Rotas de API hardcoded | 6 | 6 |
| Magic numbers (setTimeout) | 7 | 7 |
| Storage keys hardcoded | 3 | 3 |
| **TOTAL** | **56** | **56** |

---

## Arquivos de Constantes Modificados/Criados

| Arquivo | Ação | Detalhe |
|---------|------|---------|
| `src/lib/constants/routes.ts` | Atualizado | +`PORTAL_APPROVALS_LIST`, `PORTAL_CLIENT_DASHBOARD`, `TERMS`, `PRIVACY` |
| `src/lib/constants/api-routes.ts` | Atualizado | +`AUTH.INVITE_ACCEPT`, `HEALTH_AI`, `PORTAL_FEEDBACK` |
| `src/lib/constants/timing.ts` | Atualizado | +`COPIED_FEEDBACK_MS`, `REFRESH_DELAY_MS`, `FOCUS_DELAY_MS`, `FORM_FEEDBACK_MS` |
| `src/lib/constants/storage-keys.ts` | Criado | `DEGRADED_FLAG(module)` |
| `src/lib/constants/index.ts` | Atualizado | +`storage-keys` barrel export |

---

## T001 — Roles e Status (CONCLUÍDA)

### Problema
Comparações com strings literais de `UserRole` espalhadas em múltiplos arquivos, criando risco de typos e divergência com o enum Prisma.

### Arquivos Corrigidos

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `src/types/guards.ts` | `user.role === 'SOCIO'` etc. (4x) | `user.role === UserRole.SOCIO` etc. |
| `src/app/(app)/projects/[id]/board/page.tsx` | `projectRole === 'CLIENTE'`, `['PM','SOCIO'].includes(...)` | `UserRole.CLIENTE`, `=== UserRole.PM \|\| === UserRole.SOCIO` |
| `src/app/(app)/projects/[id]/timesheet/page.tsx` | `['PM','SOCIO'].includes(projectRole)` | `=== UserRole.PM \|\| === UserRole.SOCIO` |
| `src/components/scope-alerts/ScopeAlertCard.tsx` | `['PM','SOCIO'].includes(userRole)` | `=== UserRole.PM \|\| === UserRole.SOCIO` |
| `src/components/board/TaskEditForm.tsx` | `['PM','SOCIO'].includes(userRole)`, `userRole === 'DEV'` | enum values |
| `src/components/cost-config/RateConfigTable.tsx` | `SOCIO:`, `PM:`, `DEV:`, `CLIENTE:` (literal keys) | `[UserRole.SOCIO]:` etc. |
| `src/app/(app)/projects/[id]/profitability/page.tsx` | `(['SOCIO','PM'] as UserRole[]).includes(projectRole)` | `=== UserRole.SOCIO \|\| === UserRole.PM` |
| Multiple server pages | Various role string comparisons | UserRole enum values |

---

## T002–T005 — Constantes de Rotas e API (CONCLUÍDA)

### Rotas adicionadas a `routes.ts`
- `PORTAL_APPROVALS_LIST: '/portal/approvals'`
- `PORTAL_CLIENT_DASHBOARD: '/portal/dashboard'`
- `TERMS: '/terms'`
- `PRIVACY: '/privacy'`

### API routes adicionadas a `api-routes.ts`
- `AUTH.INVITE_ACCEPT: '/api/auth/invite/accept'`
- `HEALTH_AI: '/api/health/ai'`
- `PORTAL_FEEDBACK: '/api/portal/feedback'`

---

## T006 — Redirects e href em Client Components (CONCLUÍDA)

| Arquivo | Hardcode | Correção |
|---------|----------|----------|
| `src/components/auth/InviteRegisterForm.tsx` | `router.push('/dashboard')` | `ROUTES.DASHBOARD` |
| `src/components/auth/InviteRegisterForm.tsx` | `href="/terms"`, `href="/privacy"` | `ROUTES.TERMS`, `ROUTES.PRIVACY` |
| `src/components/auth/InviteExpiredCard.tsx` | `href="/login"` | `ROUTES.LOGIN` |
| `src/components/approvals/ExpiredApprovalPage.tsx` | `href="/portal/approvals"` | `ROUTES.PORTAL_APPROVALS_LIST` |
| `src/components/portal/invalid-invitation-page.tsx` | `href="/login"` | `ROUTES.LOGIN` |
| `src/components/auth/SessionTimeoutModal.tsx` | `router.push('/login')` | `ROUTES.LOGIN` |
| `src/app/not-found.tsx` | `href="/dashboard"` | `ROUTES.DASHBOARD` |
| `src/components/approvals/ApprovalResponseForm.tsx` | `ROUTES.PORTAL_APPROVALS_LIST` (já corrigido) | — |
| `src/components/portal/client-registration-flow.tsx` | `ROUTES.PORTAL_CLIENT_DASHBOARD` (já corrigido) | — |
| `src/app/(auth)/mfa/verify/page.tsx` | `ROUTES.MFA_SETUP`, `ROUTES.PORTAL`, `ROUTES.LOGIN` (já corrigido) | — |

---

## T007 — fetch() com URLs Hardcoded (CONCLUÍDA)

| Arquivo | Hardcode | Correção |
|---------|----------|----------|
| `src/lib/hooks/use-auth.ts` | `fetch('/api/auth/me')` | `API.AUTH.ME` |
| `src/lib/hooks/use-auth.ts` | `fetch('/api/auth/logout')` | `API.AUTH.LOGOUT` |
| `src/hooks/use-scope-validation-status.ts` | `fetch('/api/health/ai')` | `API.HEALTH_AI` |
| `src/components/approvals/ClientFeedbackForm.tsx` | `fetch('/api/portal/feedback')` | `API.PORTAL_FEEDBACK` |
| `src/components/auth/InviteRegisterForm.tsx` | `fetch('/api/auth/invite/accept')` | `API.AUTH.INVITE_ACCEPT` |

---

## T008 — Magic Numbers em setTimeout (CONCLUÍDA)

### Valores adicionados a `timing.ts`
- `COPIED_FEEDBACK_MS: 1_500` — duração do feedback visual de "copiado"
- `REFRESH_DELAY_MS: 1_500` — delay antes de router.refresh() pós-ação
- `FOCUS_DELAY_MS: 50` — delay para focar elemento após renderização
- `FORM_FEEDBACK_MS: 400` — delay de feedback simulado em formulários

### Arquivos Corrigidos

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `src/components/dev/DataTestOverlay.tsx` (2x) | `setTimeout(..., 1500)` | `TIMING.COPIED_FEEDBACK_MS` |
| `src/app/(app)/briefforge/.../brief-session-chat.tsx` | `setTimeout(..., 1500)` | `TIMING.REFRESH_DELAY_MS` |
| `src/app/(app)/briefforge/.../answer-input.tsx` | `setTimeout(..., 50)` | `TIMING.FOCUS_DELAY_MS` |
| `src/app/(app)/configuracoes/_components/PerfilTab.tsx` | `setTimeout(r, 400)` | `TIMING.FORM_FEEDBACK_MS` |
| `src/app/(app)/configuracoes/_components/SegurancaTab.tsx` | `setTimeout(r, 400)` | `TIMING.FORM_FEEDBACK_MS` |
| `src/app/(app)/configuracoes/_components/NotificacoesTab.tsx` | `setTimeout(r, 400)` | `TIMING.FORM_FEEDBACK_MS` |

---

## T009 — Storage Keys Hardcoded (CONCLUÍDA)

### Arquivo criado: `src/lib/constants/storage-keys.ts`
```typescript
export const STORAGE_KEYS = {
  DEGRADED_FLAG: (module: string) => `degraded-${module}`,
} as const
```

### Arquivo corrigido

| Arquivo | Hardcode | Correção |
|---------|----------|----------|
| `src/components/ui/degraded-banner.tsx` (3x) | `` `degraded-${module}` `` | `STORAGE_KEYS.DEGRADED_FLAG(module)` |

---

## Checklist Final

### Roles/Status
- [x] Nenhum role hardcoded (`'SOCIO'`, `'PM'`, `'DEV'`, `'CLIENTE'`)
- [x] `import type` → `import` para usar enum em runtime
- [x] Arrays `['PM','SOCIO'].includes()` substituídos por comparações explícitas tipadas

### Rotas
- [x] Nenhuma rota de navegação hardcoded em server pages
- [x] Nenhuma rota de navegação hardcoded em client components
- [x] Nenhuma rota de API hardcoded em hooks/components
- [x] Redirects usando `ROUTES.*`
- [x] `href` em `<Link>` usando `ROUTES.*`

### Magic Numbers
- [x] Todos os `setTimeout` com valores literais substituídos por `TIMING.*`

### Storage Keys
- [x] `degraded-${module}` centralizado em `STORAGE_KEYS.DEGRADED_FLAG(module)`
- [x] Barrel export atualizado

### Qualidade
- [x] Todos os arquivos de constantes tipados com `as const`
- [x] Barrel export (`index.ts`) atualizado
- [x] Nenhuma alteração fora do escopo de hardcodes
