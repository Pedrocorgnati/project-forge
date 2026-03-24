# Styling Tasks — ProjectForge

Gerado por: `/nextjs:styling .claude/projects/project-forge.json`
Data: 2026-03-24

---

### T001 — Registrar tokens faltantes no @theme inline ✅ COMPLETED
**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `src/app/globals.css`

**Descrição:** `--color-bg-primary/secondary/tertiary`, `--color-text-primary/secondary/muted`,
`--color-border`, `--spacing-sidebar`, `--spacing-header` e tokens de radius estão no `:root`
mas não exportados via `@theme inline`, impossibilitando seu uso como classes Tailwind.

**Critérios de Aceite:**
- [ ] Tokens de bg, text, border, spacing e radius registrados no `@theme inline`
- [ ] `bg-bg-primary`, `text-text-primary`, `text-text-muted`, `border-border` funcionam como classes

**Estimativa:** 0.5h

---

### T002 — Fix font variable: --font-inter referenciado no @theme ✅ COMPLETED
**Tipo:** SEQUENTIAL
**Dependências:** T001
**Arquivos:**
- modificar: `src/app/globals.css`

**Descrição:** `layout.tsx` declara `Inter({variable: '--font-inter'})` no `<html>`, mas
`@theme` hardcoda `--font-sans: Inter, ...` em vez de usar `var(--font-inter)`. Isso faz
com que o Next.js font optimization (swap/preload) não seja aplicado ao body.

**Critérios de Aceite:**
- [ ] `--font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif`
- [ ] Font optimization do Next.js ativa corretamente

**Estimativa:** 0.2h

---

### T003 — Substituir text-indigo-* por tokens text-brand/text-info ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** T001
**Arquivos (amostra — 34 arquivos afetados):**
- `src/components/ui/skeleton.tsx`
- `src/app/not-found.tsx`
- `src/components/scope-alerts/ScopeAlertBanner.tsx`
- `src/components/scope-alerts/ScopeAlertCard.tsx`
- `src/components/estimates/estimate-totals.tsx`
- `src/app/(app)/briefforge/[projectId]/_components/question-card.tsx`
- `src/components/estimates/estimate-version-diff.tsx`
- `src/components/timesheet/TimesheetEntryCard.tsx`

**Descrição:** 34 arquivos usam `text-indigo-*`, `bg-indigo-*`, `border-indigo-*` hardcoded
em vez dos tokens `text-brand`, `bg-brand-light`, `text-info`. Isso viola o design system
e causa inconsistência visual em dark mode (os tokens adaptam, indigo não).

**Critérios de Aceite:**
- [ ] Todos os `text-indigo-{5,6,7}` → `text-brand` ou `text-info` conforme contexto
- [ ] `bg-indigo-50` → `bg-brand-light` ou `bg-info/10`
- [ ] Dark variants (`dark:text-indigo-*`) → `dark:text-brand` equivalente

**Estimativa:** 2h

---

### T004 — Fix touch target: header mobile menu button ≥ 44px ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/components/layout/header.tsx`

**Descrição:** Botão hamburger com `p-2` produz target de ~36px (8+20+8). Mínimo WCAG
é 44px. Corrigir para `p-3` (12+20+12 = 44px).

**Critérios de Aceite:**
- [ ] Mobile menu button `p-3` ou `min-w-[44px] min-h-[44px]`
- [ ] Touch target ≥ 44px verificado

**Estimativa:** 0.1h

---

### T005 — Substituir text-purple-500 por token semântico no dashboard ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** T001
**Arquivos:**
- modificar: `src/app/(app)/dashboard/page.tsx`

**Descrição:** Ícone Users usa `text-purple-500` sem equivalente no design token.
Adicionar `--color-clients` ou usar variante adequada do token.

**Critérios de Aceite:**
- [ ] `text-purple-500` removido do dashboard
- [ ] Token definido em globals.css ou cor semântica existente usada

**Estimativa:** 0.2h

---

### T006 — ThemeToggle + next-themes [PENDENTE — requer decisão]
**Tipo:** SEQUENTIAL
**Dependências:** T001, T002
**Arquivos:**
- criar: `src/components/ui/theme-toggle.tsx`
- modificar: `src/components/providers.tsx`
- modificar: `src/app/layout.tsx`
- modificar: `src/components/layout/header.tsx`

**Descrição:** Dark mode baseado em `.dark` mas sem mecanismo de troca.
`suppressHydrationWarning` no `<html>` sugere intenção. Requer:
1. Instalar `next-themes`
2. Envolver app em `ThemeProvider`
3. Criar `ThemeToggle` (sun/moon com `aria-label`)
4. Adicionar toggle no header

**Critérios de Aceite:**
- [ ] `next-themes` instalado e `ThemeProvider` ativo
- [ ] `ThemeToggle` renderizado no header
- [ ] Sem FOUC (flash de tema incorreto)
- [ ] `aria-label` descritivo no toggle

**Estimativa:** 1.5h
**Nota:** Requer instalação de dependência. Executar manualmente com `npm install next-themes`.

---

### T007 — Remover duplicação de background no app layout ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/app/(app)/layout.tsx`

**Descrição:** `root/layout.tsx` já define `bg-slate-50 dark:bg-slate-950` no `<body>`.
`(app)/layout.tsx` repete `bg-slate-50 dark:bg-slate-950` no wrapper `<div>` — redundante.

**Critérios de Aceite:**
- [ ] Duplicação removida do app layout
- [ ] Visual idêntico

**Estimativa:** 0.1h
