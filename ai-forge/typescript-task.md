# TypeScript Tasks — ProjectForge

Gerado por: `/nextjs:typescript .claude/projects/project-forge.json`
Data: 2026-03-24

---

### T001 — Fix missing `z` (Zod) import em cost-config.ts ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/actions/cost-config.ts`

**Descrição:** `UpdateCostConfigSchema` usa `z.object`, `z.number`, `z.string` mas `z` não é importado.
Causa TS2304 em 3 lugares. O arquivo importa do `@/schemas/cost-config.schema` mas não importa `z` de `zod`.

**Critérios de Aceite:**
- [ ] `import { z } from 'zod'` adicionado
- [ ] TS2304 eliminados

**Estimativa:** 0.1h

---

### T002 — Fix `catch (error: any)` → `catch (error: unknown)` ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/app/api/projects/[id]/change-orders/impact/route.ts`
- modificar: `src/app/api/projects/[id]/change-orders/route.ts`
- modificar: `src/app/api/projects/[id]/change-orders/[coId]/approve/route.ts`
- modificar: `src/app/api/projects/[id]/change-orders/[coId]/route.ts`
- modificar: `src/app/api/projects/[id]/change-orders/[coId]/submit/route.ts`
- modificar: `src/app/api/projects/[id]/change-orders/[coId]/reject/route.ts`
- modificar: `src/app/api/projects/[id]/tasks/[taskId]/route.ts`
- modificar: `src/app/api/projects/[id]/tasks/route.ts`
- modificar: `src/app/api/projects/[id]/scope-alerts/[alertId]/route.ts`
- modificar: `src/app/api/projects/[id]/scope-alerts/route.ts`
- modificar: `src/app/api/projects/[id]/scope-baseline/[baselineId]/route.ts`
- modificar: `src/app/api/projects/[id]/scope-baseline/route.ts`

**Descrição:** 19 catch blocks usam `: any` para acessar `error?.statusCode`. Deve usar `unknown` +
`instanceof AppError` type guard que já existe em `src/lib/errors.ts`.

**Critérios de Aceite:**
- [ ] Todos os `catch (error: any)` → `catch (error: unknown)`
- [ ] `error?.statusCode === 403` → `error instanceof AppError && error.statusCode === 403`
- [ ] TS strict `strictNullChecks` não quebrado

**Estimativa:** 0.5h

---

### T003 — Fix logger TS2769: `log.error(string, unknown)` → `log.error({ err }, string)` ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/app/api/auth/callback/route.ts`
- modificar: `src/app/api/auth/invite/route.ts`
- modificar: `src/app/api/auth/logout/route.ts`
- modificar: `src/app/api/briefs/[id]/route.ts`
- modificar: `src/app/api/briefs/[id]/prd/route.ts`
- modificar: `src/app/api/briefs/[id]/prd/versions/route.ts`
- modificar: `src/app/api/briefs/[id]/sessions/route.ts`
- modificar: `src/app/api/briefs/[id]/sessions/[sessionId]/questions/route.ts`
- modificar: `src/app/api/briefs/[id]/sessions/[sessionId]/route.ts`
- modificar: `src/app/api/categories/route.ts`
- modificar: `src/app/api/cron/*.ts` (5 routes)
- modificar: `src/app/api/portal/**/*.ts` (3 routes)
- modificar: `src/app/api/projects/[id]/approvals/**/*.ts`
- modificar: `src/app/api/projects/[id]/estimates/**/*.ts`
- modificar: `src/app/api/events/route.ts`
- modificar: `src/app/api/scheduler/route.ts`

**Descrição:** Pino logger tem overloads:
- `(msg: string): void`
- `(obj: object, msg?: string): void`
Quando usado como `log.error('msg:', err)` onde `err` é `unknown | string | undefined`,
TypeScript resolve para `(obj: 'msg:', msg?: undefined)` e rejeita o segundo arg.
Fix: `log.error({ err }, 'message')`.

**Critérios de Aceite:**
- [ ] Todos os `log.error(string, value)` → `log.error({ err: value }, string)`
- [ ] TS2769 eliminados

**Estimativa:** 1h

---

### T004 — Fix TS7006 implicit any em callbacks ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/actions/cost-config.ts`
- modificar: `src/actions/estimai.ts`
- modificar: `src/actions/projects.ts`
- modificar: `src/actions/rentabilia.ts`
- modificar: `src/app/(app)/board/page.tsx`
- modificar: `src/app/(app)/projects/[id]/board/page.tsx`
- modificar: `src/app/(app)/projects/[id]/handoff/page.tsx`
- modificar: `src/app/(app)/projects/[id]/handoff/qa/page.tsx`
- modificar: `src/app/(app)/projects/[id]/timesheet/page.tsx`
- modificar: `src/app/(app)/scopeshield/page.tsx`
- modificar: `src/app/api/briefs/[id]/sessions/[sessionId]/questions/route.ts`
- modificar: `src/app/api/cron/checkpoint-service/route.ts`
- modificar: `src/app/api/cron/recalculate-project-metrics/route.ts`
- modificar: `src/app/api/projects/[id]/approvals/export/route.ts`
- modificar: `src/app/api/projects/[id]/checkpoints/route.ts`
- modificar: `src/app/api/projects/[id]/estimates/[estimateId]/route.ts`
- modificar: `src/app/api/projects/[id]/estimates/[estimateId]/revise/route.ts`
- outros

**Descrição:** 113 parâmetros de callback (`.map()`, `.reduce()`, `.filter()`, `$transaction`) sem tipo explícito.
Parâmetros como `(sum, t)`, `(member)`, `(tx)`, `(e)`, `(m)`, `(project)` inferidos como `any`.

**Critérios de Aceite:**
- [ ] Todos TS7006 em `src/` eliminados
- [ ] Callbacks com types explícitos ou inferidos corretamente
- [ ] `$transaction(tx => ...)` tipados com `Prisma.TransactionClient`

**Estimativa:** 2h

---

### T005 — Tipar componentes de estimate com tipos corretos ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/components/estimates/estimate-list-client.tsx`
- modificar: `src/components/estimates/estimate-detail-client.tsx`
- modificar: `src/components/estimates/estimate-export-csv.tsx`
- modificar: `src/lib/utils/change-order.ts`

**Descrição:** Componentes usam `any[]` e `any` para `initialEstimates`, `estimate`, `items` props.
`change-order.ts` mapeia `co: any` sem tipo. Devem usar tipos de `@/types/estimate-ui` ou Prisma.

**Critérios de Aceite:**
- [ ] `initialEstimates: any[]` → tipo do hook `useEstimateRealtime`
- [ ] `estimate: any` → `EstimateWithDetails` ou equivalente
- [ ] `mapCO(co: any)` → `mapCO(co: ReturnType<typeof prisma.changeOrder.findFirst>)` ou interface

**Estimativa:** 0.5h

---

### T006 — Adicionar `noUncheckedIndexedAccess` no tsconfig [PENDENTE]
**Tipo:** SEQUENTIAL
**Dependências:** T007 (Prisma generate), T004
**Arquivos:**
- modificar: `tsconfig.json`

**Descrição:** `tsconfig.json` tem `strict: true` mas não tem `noUncheckedIndexedAccess`.
Avaliado em 2026-03-24: habilitar introduz 49 novos erros — a maioria em array indexing sem verificação.
Executar APÓS T007 (Prisma generate) pois muitos podem ser Prisma-related.

**Critérios de Aceite:**
- [ ] `"noUncheckedIndexedAccess": true` adicionado
- [ ] Todos 49 erros corrigidos ou suprimidos com justificativa
- [ ] `tsc --noEmit` passa

**Estimativa:** 2h
**Nota:** Não habilitar antes do Prisma generate (T007).

---

### T007 — TS2305 Prisma não gerado [BLOQUEIO DE INFRA]
**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:** 174 erros em 50+ arquivos

**Descrição:** `@prisma/client` não está gerado. Todos os imports de enums e `PrismaClient` do
`@prisma/client` falham com TS2305. Root cause: `prisma generate` não foi executado.
Já rastreado em TASK-REFORGE-002 da sessão anterior.

**Critérios de Aceite:**
- [ ] `prisma generate` executado
- [ ] Todos TS2305 eliminados

**Estimativa:** Infra — não é código, apenas `npx prisma generate`
**Nota:** Não corrigir arquivos individuais. Executar `npx prisma generate`.

---

---

### T008 — Fix test infrastructure issues ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- criar: `src/lib/auth/index.ts` (barrel export para `@/lib/auth`)
- modificar: `tests/integration/approvals.test.ts` (definite assignment `!`)
- modificar: `tests/integration/projects.test.ts` (`as unknown as` casts, add `currency`)
- modificar: `tests/integration/timesheets.test.ts` (`as unknown as` casts)
- modificar: `src/lib/email/__tests__/send-client-invitation.test.ts` (`Object.assign` para NODE_ENV)
- modificar: `src/lib/rbac/__tests__/permissions.test.ts` (remove unused `@ts-expect-error`)
- modificar: `vitest.config.integration.ts` (TS2769 poolOptions → `sequence: { concurrent: false }`)

**Descrição:** Erros em test/config infrastructure que não eram Prisma-related:
missing barrel `@/lib/auth`, read-only `process.env.NODE_ENV`, unused `@ts-expect-error`,
type casts insuficientes, `singleFork` removida do vitest v4 InlineConfig.

**Estimativa:** 0.5h (completada)

---

### T009 — Fix TS2339 em github-fetcher e timesheet/export ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/lib/rag/github-fetcher.ts` (Map genérico explícito)
- modificar: `src/app/api/projects/[id]/timesheet/export/route.ts` (add `createdAt` ao inline type)
- modificar: `src/app/projects/[id]/approvals/[approvalId]/page.tsx` (Map genérico explícito)
- modificar: `src/app/portal/approvals/page.tsx` (`?? ''` para description)
- modificar: `src/components/profitability/CheckpointTimeline.tsx` (`createCheckpoint(undefined)`)
- modificar: `src/lib/db.ts` (type binding `$allOperations`)

**Descrição:** TS2339 e TS2554 em componentes e APIs causados por inferência incorreta
de tuplas em `new Map()` e missing fields em tipos inline.

**Estimativa:** 0.5h (completada)
