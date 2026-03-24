<metadata>
source: /nextjs:architecture code review
config: .claude/projects/project-forge.json
repo: output/workspace/project-forge
date: 2026-03-23
estimated-hours: 4
complexity: medium
</metadata>

<overview>
Refatoração focada em 5 problemas arquiteturais identificados:
1. profitability-client.tsx duplicado (109 linhas idênticas em 2 route groups)
2. DegradedBanner com colisão de nome entre ui/ e profitability/
3. Convenção de nomes inconsistente (kebab-case vs PascalCase) em src/components
4. configuracoes/page.tsx com 5 abas inline (332 linhas)
5. lib/index.ts misturando hooks client com utils server
</overview>

<task-list>

### T001 - Eliminar duplicação de profitability-client.tsx

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- criar: `src/components/profitability/ProfitabilityClient.tsx`
- modificar: `src/app/(app)/projects/[id]/profitability/profitability-client.tsx`
- modificar: `src/app/(dashboard)/projects/[id]/profitability/profitability-client.tsx`

**Descrição:**
Extrair o componente `ProfitabilityClient` para `src/components/profitability/` e fazer ambas as pages reexportá-lo (ou importar diretamente). Os dois arquivos diferem apenas no comentário de cabeçalho (2 linhas); 107 linhas são idênticas.

**Critérios de Aceite:**
- [ ] Componente extraído para `src/components/profitability/ProfitabilityClient.tsx`
- [ ] Ambos os `profitability-client.tsx` viram re-exports simples
- [ ] Build sem erros
- [ ] Nenhuma feature de UI alterada

**Status:** COMPLETED
**Estimativa:** 0.5h

---

### T002 - Resolver colisão de nome DegradedBanner

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `src/components/profitability/DegradedBanner.tsx` (renomear para AIInsightsFallbackBanner)
- modificar: `src/components/profitability/AIInsightsPanel.tsx` (atualizar import)

**Descrição:**
`src/components/profitability/DegradedBanner.tsx` e `src/components/ui/degraded-banner.tsx` têm o mesmo nome mas propósitos distintos:
- profitability/DegradedBanner: banner estático simples para IA indisponível (sem módulo, sem dismiss)
- ui/degraded-banner: banner com módulos, localStorage, dismiss

Renomear o componente local para `AIInsightsFallbackBanner` para clareza semântica e eliminar confusão de imports.

**Critérios de Aceite:**
- [ ] `profitability/DegradedBanner.tsx` renomeado para `AIInsightsFallbackBanner.tsx`
- [ ] Import em `AIInsightsPanel.tsx` atualizado
- [ ] `src/components/ui/degraded-banner.tsx` não modificado
- [ ] Build sem erros

**Status:** COMPLETED
**Estimativa:** 0.25h

---

### T003 - Padronizar naming convention para PascalCase em components/approvals e components/auth

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos (approvals - renomear):**
- `approval-detail-sheet.tsx` → `ApprovalDetailSheet.tsx`
- `approval-request-card.tsx` → `ApprovalRequestCard.tsx`
- `approval-response-form.tsx` → `ApprovalResponseForm.tsx`
- `client-approval-card.tsx` → `ClientApprovalCard.tsx`
- `client-feedback-form.tsx` → `ClientFeedbackForm.tsx`
- `create-approval-button.tsx` → `CreateApprovalButton.tsx`
- `create-approval-modal.tsx` → `CreateApprovalModal.tsx`
- `expired-approval-page.tsx` → `ExpiredApprovalPage.tsx`
- `sla-countdown-badge.tsx` → `SlaCountdownBadge.tsx`

**Arquivos (auth - renomear):**
- `permission-gate.tsx` → `PermissionGate.tsx`
- `role-guard.tsx` → `RoleGuard.tsx`
- `session-timeout-modal.tsx` → `SessionTimeoutModal.tsx`

**Descrição:**
Padronizar naming convention para PascalCase em todas as pastas de componentes de domínio (board, change-orders, profitability já usam PascalCase). Renomear arquivos e atualizar todos os imports correspondentes.

Nota: `src/components/ui/` e `src/components/estimates/` mantêm kebab-case (padrão shadcn/ui e convenção estabelecida).

**Critérios de Aceite:**
- [ ] Todos os arquivos em components/approvals renomeados para PascalCase
- [ ] Todos os arquivos em components/auth renomeados para PascalCase
- [ ] Todos os imports atualizados em toda a codebase
- [ ] Build sem erros
- [ ] Re-exports de index.ts atualizados se existirem

**Status:** COMPLETED
**Estimativa:** 1h

---

### T004 - Extrair tabs de configuracoes/page.tsx em subcomponentes

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- criar: `src/app/(app)/configuracoes/_components/PerfilTab.tsx`
- criar: `src/app/(app)/configuracoes/_components/SegurancaTab.tsx`
- criar: `src/app/(app)/configuracoes/_components/NotificacoesTab.tsx`
- modificar: `src/app/(app)/configuracoes/page.tsx`

**Descrição:**
`configuracoes/page.tsx` tem 332 linhas com 5 abas renderizadas inline. Extrair pelo menos os 3 subcomponentes com lógica (perfil, segurança, notificações) para `_components/`. As abas integracoes e workspace são placeholders e podem permanecer inline.

**Critérios de Aceite:**
- [ ] `PerfilTab.tsx` criado com schema Zod + form + submit handler
- [ ] `SegurancaTab.tsx` criado com schema Zod + form + submit handler
- [ ] `NotificacoesTab.tsx` criado com toggles + submit handler
- [ ] `page.tsx` reduzido para <150 linhas (navegação + composição)
- [ ] Build sem erros

**Status:** COMPLETED
**Estimativa:** 1h

---

### T005 - Adicionar comentário de arquitetura nos route groups

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/app/(app)/layout.tsx` (adicionar JSDoc explicando o grupo)
- modificar: `src/app/(dashboard)/layout.tsx` (adicionar JSDoc explicando o grupo)
- modificar: `src/app/(auth)/` layouts (idem)

**Descrição:**
A separação `(app)` vs `(dashboard)` não é óbvia:
- `(app)`: layout visual completo (sidebar + header) + session timeout
- `(dashboard)`: guard de RBAC server-side (redireciona CLIENTE para /portal)

Adicionar JSDoc comments explicando a responsabilidade de cada route group e quando usar cada um.

**Critérios de Aceite:**
- [ ] `(app)/layout.tsx` tem comment explicando: "Layout visual (sidebar/header). Não aplica RBAC — use (dashboard) para rotas que requerem restrição de role."
- [ ] `(dashboard)/layout.tsx` tem comment explicando: "Guard RBAC server-side. Redireciona CLIENTE para /portal/dashboard."
- [ ] Build sem erros

**Status:** COMPLETED
**Estimativa:** 0.25h

</task-list>

<validation-strategy>
- Executar `npm run build` após cada task
- Verificar que não há imports quebrados com `grep -r "from.*profitability/DegradedBanner"` após T002
- Verificar rename com `find src -name "approval-*.tsx"` após T003
- Verificar redução de linhas em configuracoes/page.tsx após T004
</validation-strategy>

<acceptance-criteria>
- [ ] T001: profitability-client.tsx sem duplicação
- [ ] T002: DegradedBanner sem colisão de nome
- [ ] T003: components/approvals e components/auth em PascalCase
- [ ] T004: configuracoes/page.tsx < 150 linhas
- [ ] T005: route groups documentados
- [ ] Build passando
</acceptance-criteria>
