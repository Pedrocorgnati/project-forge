# Architecture Report — project-forge

**Data:** 2026-03-23
**Config:** .claude/projects/project-forge.json
**Workspace:** output/workspace/project-forge

---

## Resumo Executivo

5 problemas arquiteturais identificados e 5 tasks executadas. Build-breaking: nenhum.

---

## Problemas Identificados

### [DRY-001] profitability-client.tsx duplicado — CRÍTICO
**Evidência:**
```bash
diff src/app/(app)/projects/[id]/profitability/profitability-client.tsx \
     src/app/(dashboard)/projects/[id]/profitability/profitability-client.tsx
# Resultado: apenas 2 linhas de cabeçalho diferentes (109 linhas idênticas)
```
**Impacto:** Risco de divergência silenciosa em manutenção. Qualquer fix no componente precisaria ser replicado manualmente.
**Status:** CORRIGIDO — extraído para `src/components/profitability/ProfitabilityClient.tsx`

---

### [DRY-002] DegradedBanner com nome colidente — MÉDIO
**Evidência:**
```bash
grep -rn "DegradedBanner" src --include="*.tsx" | grep import
# src/components/profitability/DegradedBanner.tsx — estático (37 linhas)
# src/components/ui/degraded-banner.tsx — module-aware com dismiss (88 linhas)
# AIInsightsPanel importava o local; handoff/briefforge importavam o ui/
```
**Impacto:** Confusão de imports. Qualquer dev novo importaria o errado ao digitar `DegradedBanner`.
**Status:** CORRIGIDO — profitability renomeado para `AIInsightsFallbackBanner`. `DegradedBanner.tsx` mantido como re-export de compatibilidade.

---

### [NAMING-001] Convenção de nomes inconsistente em components — MÉDIO
**Evidência:**
```bash
find src/components -name "*.tsx" | xargs basename | grep "^[a-z]" | wc -l  # 40 kebab-case
find src/components -name "*.tsx" | xargs basename | grep "^[A-Z]" | wc -l  # 46 PascalCase
# board/ usa PascalCase; approvals/, auth/, estimates/ usam kebab-case
```
**Impacto:** Inconsistência dificulta tab-complete e scan visual de imports.
**Status:** CORRIGIDO — components/approvals e components/auth padronizados para PascalCase.

---

### [STRUCT-001] configuracoes/page.tsx com 5 abas inline — MENOR
**Evidência:**
```bash
wc -l src/app/(app)/configuracoes/page.tsx  # 332 linhas
grep -c "activeTab ==" src/app/(app)/configuracoes/page.tsx  # 5 condicionais
```
**Impacto:** Arquivo com múltiplas responsabilidades (schemas, forms, handlers, 5 seções de UI).
**Status:** CORRIGIDO — 332 linhas → 121. Extraídos: `PerfilTab`, `SegurancaTab`, `NotificacoesTab`.

---

### [ARCH-001] Route groups (app) vs (dashboard) sem documentação — MÉDIO
**Evidência:**
```
(app)/projects/[id]: board, estimates, handoff, profitability, settings, timesheet
(dashboard)/projects/[id]: change-orders, profitability, scope-alerts
# profitability existe nos dois — confusão de qual usar
```
**Impacto:** Não é óbvio quando usar (app) vs (dashboard). Pode levar a RBAC omitido.
**Status:** CORRIGIDO — JSDoc adicionado em ambos os layouts explicando responsabilidade.

---

## Métricas

| Métrica | Antes | Depois |
|---------|-------|--------|
| profitability-client duplicado | 2 arquivos × 109 linhas | 1 arquivo × 110 linhas + 2 re-exports |
| configuracoes/page.tsx | 332 linhas | 121 linhas |
| Componentes com nome colidente (DegradedBanner) | 2 | 0 |
| Componentes kebab-case em approvals/ | 9 | 0 |
| Componentes kebab-case em auth/ | 3 | 0 |
| Arquivos criados | — | 7 novos |
| Arquivos modificados | — | 19 |
| Imports atualizados | — | 29 |

---

## Arquivos Criados

```
src/components/profitability/ProfitabilityClient.tsx       ← componente compartilhado
src/components/profitability/AIInsightsFallbackBanner.tsx  ← renomeado de DegradedBanner
src/app/(app)/configuracoes/_components/PerfilTab.tsx
src/app/(app)/configuracoes/_components/SegurancaTab.tsx
src/app/(app)/configuracoes/_components/NotificacoesTab.tsx
```

## Arquivos Principais Modificados

```
src/app/(app)/projects/[id]/profitability/profitability-client.tsx   ← re-export
src/app/(dashboard)/projects/[id]/profitability/profitability-client.tsx ← re-export
src/components/profitability/DegradedBanner.tsx                       ← re-export de compatibilidade
src/components/profitability/AIInsightsPanel.tsx                      ← import atualizado
src/app/(app)/configuracoes/page.tsx                                   ← 332 → 121 linhas
src/app/(app)/layout.tsx                                               ← JSDoc adicionado
src/app/(dashboard)/layout.tsx                                         ← JSDoc adicionado
src/components/approvals/ (9 arquivos renomeados)
src/components/auth/ (3 arquivos renomeados)
+ 17 arquivos com imports atualizados
```

---

## Issues Não Resolvidos (fora de escopo ou aceitáveis)

| Issue | Motivo |
|-------|--------|
| `lib/index.ts` barrel com 72 linhas misturando hooks e server utils | Barrel intencional com comentário explícito; refatorar pode quebrar muitos imports. Monitorar com `/nextjs:configuration`. |
| `(dashboard)/profitability` vs `(app)/profitability` — RBAC inconsistente | Problema arquitetural mais profundo; documentado no layout. Levar para `/skill:security-review-gate`. |
| `components/estimates/` ainda em kebab-case | Convenção diferente (shadcn-style); não foi escopo desta task. |
| `ChangeOrderDetail.tsx` com 315 linhas | Limite aceitável para sheet de detalhe complexo. |

---

## Checklist de Aceitação

- [x] profitability-client.tsx sem duplicação
- [x] DegradedBanner sem colisão de nome
- [x] components/approvals em PascalCase
- [x] components/auth em PascalCase
- [x] configuracoes/page.tsx < 150 linhas (121)
- [x] route groups documentados
- [x] Nenhum import quebrado (verificado via grep)
