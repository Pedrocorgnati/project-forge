# Server/Client Boundaries Tasks — ProjectForge

Gerado por: `/nextjs:boundaries .claude/projects/project-forge.json`
Data: 2026-03-24

---

### T001 — Instalar `server-only` e `client-only` + proteger módulos críticos ✅ COMPLETED
**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `package.json` (instalar pacotes)
- modificar: `src/lib/db.ts` (add `import 'server-only'`)
- modificar: `src/lib/auth/get-user.ts` (add `import 'server-only'`)
- modificar: `src/lib/export/estimate-csv.ts` (add `import 'client-only'`)

**Descrição:**
Os pacotes `server-only` e `client-only` não estão instalados e nenhum módulo os usa.
- `lib/db.ts` expõe `PrismaClient` — se importado acidentalmente em um Client Component, vaza conexão de banco e secrets para o bundle do cliente.
- `lib/auth/get-user.ts` usa Supabase server-side + Prisma — mesma superfície de risco.
- `lib/export/estimate-csv.ts` usa `document.createElement`, `document.body` e `URL.createObjectURL` sem guards de SSR nem `'use client'` — crasharia se importado em um Server Component.

**Critérios de Aceite:**
- [ ] `server-only` e `client-only` instalados (`npm install server-only client-only`)
- [ ] `import 'server-only'` como primeira linha de `lib/db.ts`
- [ ] `import 'server-only'` como primeira linha de `lib/auth/get-user.ts`
- [ ] `import 'client-only'` como primeira linha de `lib/export/estimate-csv.ts`
- [ ] Build não quebra com as adições

**Estimativa:** 0.3h

---

### T002 — `lib/export/estimate-pdf.ts` usa `'use client'` em módulo utilitário ✅ COMPLETED
**Tipo:** PARALLEL
**Dependências:** T001
**Arquivos:**
- modificar: `src/lib/export/estimate-pdf.ts`

**Descrição:**
`estimate-pdf.ts` usa `'use client'` como diretiva de módulo — isso é válido e funciona, mas é semântica de component tree. Para utilitários de biblioteca que precisam do browser, `import 'client-only'` é a forma correta e gera erro de build mais claro se importado no servidor.

**Critérios de Aceite:**
- [ ] `'use client'` removido
- [ ] `import 'client-only'` adicionado como primeira linha
- [ ] Funcionalidade de exportação PDF preservada

**Estimativa:** 0.1h

---

## Achados sem ação necessária

| Item | Status | Motivo |
|------|--------|--------|
| `DegradedBanner` localStorage | ✅ OK | `typeof window !== 'undefined'` guard no `useState` initializer |
| `handle-error.ts` `window.location.href` | ✅ OK | Guarded com `typeof window !== 'undefined'` |
| `useLocalStorage` hook | ✅ OK | Tem `'use client'` + SSR guards |
| `Math.random()` em mfa/setup | ✅ OK | Em componente `'use client'`, sem hydration mismatch |
| `suppressHydrationWarning` em layout | ✅ OK | Único uso, na raiz, correto para theme toggle |
| Context `lib/ai/context.tsx` | ✅ OK | Tem `'use client'` |
| 169 arquivos com `'use client'` | ✅ OK | Todos os hooks/eventos têm a diretiva |
| Props Server → Client | ✅ OK | Sem Dates não-serializadas ou funções passadas como props |
| Hydration (Date/Math.random) | ✅ OK | Todos em contexto `'use client'` |
| `dynamic(..., { ssr: false })` | ✅ N/A | html2pdf.js importado via `await import()` dentro de função — seguro |
| `useEffect + fetch` patterns | ✅ Aceitável | São modais que carregam dados reativos (tasks para CO, versões de PRD) — não candidatos a Server Component |
| Providers centralizados | ✅ OK | `providers/query-client.tsx` concentra os providers client |
