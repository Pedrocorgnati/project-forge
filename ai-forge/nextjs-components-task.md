# nextjs-components-task.md

Gerado por: `/nextjs:nextjs-components`
Config: `.claude/projects/project-forge.json`
Data: 2026-03-24

---

## Checklist geral

```
## next/image
- <img> → <Image>: N/A (sem <img> encontrado)
- width+height ou fill+sizes: ✅
- priority em hero/logo: ❌ (T001)
- placeholder blur/skeleton: N/A (imagens são SVGs/QR estáticos)
- remotePatterns configurado: ✅ (*.supabase.co)

## next/link
- Links internos usam <Link>: ✅
- Sem <a> filho: ✅
- Prefetch controlado: ✅
- router.push apenas quando precisa: ❌ (T002 — window.location.href em navegação simples)

## next/font
- Fonts em next/font: ✅ (Inter via next/font/google)
- display: 'swap' + subset correto: ⚠️ implícito — explicitar (T003)
- CSS vars aplicadas no layout/tailwind: ✅ (--font-inter, h-full antialiased)
- Sem <link> externo/@import: ✅

## next/script
- Scripts de terceiros via Script: N/A (Vercel Analytics/SpeedInsights são componentes React — não precisam de next/script)
- Strategy definido: N/A

## next.config.js
- remotePatterns completo: ✅
- formats/deviceSizes: ❌ (T004 — sem AVIF/WebP explícito)
- Loader custom: N/A
```

---

## Tasks

### T001 — priority em logos above-fold (header + login)

**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Prioridade:** ALTA
**Arquivos:**
- modificar: `src/components/layout/header.tsx`
- modificar: `src/app/(auth)/login/page.tsx`

**Descrição:**
O logo SVG renderizado no `<Header>` (fixo no topo, visível em todas as páginas autenticadas) e
na página de login não têm a prop `priority`. Sem `priority`, o Next.js trata essas imagens como
lazy-loaded, gerando uma requisição de fetch que atrasa o LCP. Como são recursos above-fold
garantidos, `priority` deve ser adicionado para pré-carregar via `<link rel="preload">`.

**Critérios de Aceite:**
- [ ] `priority` adicionado ao `<Image>` de logo no header
- [ ] `priority` adicionado ao `<Image>` de logo no login
- [ ] Build sem erros

---

### T002 — window.location.href para navegação interna em brief-summary-view

**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Prioridade:** MÉDIA
**Arquivos:**
- modificar: `src/app/(app)/briefforge/[projectId]/_components/brief-summary-view.tsx`

**Descrição:**
`window.location.href = \`/briefforge/${projectId}/prd\`` em linha 116 força um full page reload,
perdendo o estado React e causando flash branco desnecessário. Esta é uma rota interna do app
Next.js e deve usar `router.push` para navegação client-side (SPA transition).

**Critérios de Aceite:**
- [ ] `useRouter` importado de `next/navigation`
- [ ] `window.location.href` substituído por `router.push(\`/briefforge/${projectId}/prd\`)`
- [ ] Build sem erros

---

### T003 — Inter font: adicionar display: 'swap' explícito

**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Prioridade:** BAIXA
**Arquivos:**
- modificar: `src/app/layout.tsx`

**Descrição:**
`Inter({ subsets: ['latin'], variable: '--font-inter' })` não declara `display: 'swap'` explicitamente.
O Next.js usa `'swap'` como default para Google Fonts, mas ser explícito evita regressões
caso o padrão mude e é self-documenting.

**Critérios de Aceite:**
- [ ] `display: 'swap'` adicionado à config do Inter
- [ ] Build sem erros

---

### T004 — next.config: adicionar formats AVIF/WebP

**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Prioridade:** BAIXA
**Arquivos:**
- modificar: `next.config.ts`

**Descrição:**
`images.remotePatterns` está correto, mas sem `formats` explícito o Next.js usa apenas WebP
em alguns navegadores. Declarar `['image/avif', 'image/webp']` habilita AVIF como prioridade
para navegadores que suportam (melhor compressão, menor LCP).

**Critérios de Aceite:**
- [ ] `images.formats: ['image/avif', 'image/webp']` adicionado
- [ ] Build sem erros

---

## Não-problemas

| Item | Razão |
|------|-------|
| avatar.tsx `sizes="48px"` | Container tem tamanho CSS fixo; Next.js usa sizes apenas para seleção de variante — 48px é o valor máximo correto |
| `@vercel/analytics` / `@vercel/speed-insights` | São componentes React otimizados, não precisam de `<Script>` |
| `router.push` nas flows de auth/MFA | Navegação programática pós-ação de formulário — correto |
| `window.location.reload()` em error-boundary | Recarregamento intencional para recuperação de erro |
| `window.location.origin` em URLs OAuth | Necessário para construir redirectTo/callbackUrl absolutos — não é navegação interna |
| Imagens SVG em `public/` | SVGs não passam pelo Image Optimization (correto) — Next/Image as serve diretamente |
| `unoptimized` no QR code de MFA | Correto — URL dinâmica de QR code não deve ser otimizada pelo CDN |
