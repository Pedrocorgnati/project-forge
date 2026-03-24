# Accessibility Report — Project Forge
_Auditoria realizada em 2026-03-23 | /nextjs:accessibility_

## Resumo Executivo

| Categoria | Issues | Status |
|---|---|---|
| Ícones decorativos sem aria-hidden | 4 arquivos | ✅ CORRIGIDO |
| Landmark `<main>` ausente | Auth layout | ✅ CORRIGIDO |
| Skip link inoperante (portal) | 2 layouts | ✅ CORRIGIDO |
| Dialog sem aria-modal | NotificationList | ✅ CORRIGIDO |
| User menu sem aria-controls | Header | ✅ CORRIGIDO |
| Portal header sem skip link | PortalHeader | ✅ CORRIGIDO |

**Total de issues:** 8 (7 corrigidos + 1 combinado)
**Arquivos modificados:** 8
**Risco residual:** BAIXO

---

## Issues Corrigidos

### A1 — Sidebar NavItem Icon sem `aria-hidden` [WCAG 1.1.1]
- **Arquivo:** `src/components/layout/sidebar.tsx:65`
- **Problema:** `<Icon size={20}>` decorativo anunciado por screen readers junto com o texto do link
- **Correção:** `aria-hidden="true"` adicionado

### A2 — AuthLayout sem landmark `<main>` [WCAG 1.3.1, 2.4.1]
- **Arquivo:** `src/app/(auth)/layout.tsx`
- **Problema:** 5 páginas de auth sem região principal semântica (div aninhadas)
- **Correção:** `<main id="main-content" tabIndex={-1}>` wrapping children

### A3 — Portal layouts sem `id="main-content"` [WCAG 2.4.1]
- **Arquivos:** `src/app/portal/dashboard/layout.tsx`, `src/app/portal/approvals/layout.tsx`
- **Problema:** `<main>` sem id; skip link do PortalHeader não tinha alvo
- **Correção:** `id="main-content" tabIndex={-1}` adicionado a ambos; skip link adicionado ao PortalHeader

### A4 — NotificationBell `<Bell>` sem `aria-hidden` [WCAG 1.1.1]
- **Arquivo:** `src/components/notifications/notification-bell.tsx:33`
- **Problema:** Ícone decorativo anunciado dentro de botão com aria-label
- **Correção:** `aria-hidden="true"` adicionado

### A5 — PortalHeader `<LogOut>` sem `aria-hidden` [WCAG 1.1.1]
- **Arquivo:** `src/components/portal/portal-header.tsx:41`
- **Problema:** Ícone decorativo dentro de botão com texto "Sair"
- **Correção:** `aria-hidden="true"` adicionado

### A6 — MFA Setup icons `<Check>`/`<Copy>` sem `aria-hidden` [WCAG 1.1.1]
- **Arquivo:** `src/app/(auth)/mfa/setup/page.tsx:156-157, 204-205`
- **Problema:** Ícones de status visual dentro de botões com conteúdo textual
- **Correção:** `aria-hidden="true"` adicionado em todos os 4 ícones

### A7 — NotificationList dialog sem `aria-modal` [WCAG 4.1.2]
- **Arquivo:** `src/components/notifications/notification-list.tsx:40,61`
- **Problema:** `role="dialog"` sem `aria-modal="true"` — screen readers continuam lendo conteúdo externo
- **Correção:** `aria-modal="true"` adicionado + `aria-labelledby="notification-list-title"` conectado ao h3

### A8 — Header user menu sem `aria-controls` [WCAG 4.1.2]
- **Arquivo:** `src/components/layout/header.tsx`
- **Problema:** Botão com `aria-expanded` sem `aria-controls` apontando para o dropdown
- **Correção:** `aria-controls="user-menu-dropdown"` no botão; `id="user-menu-dropdown"` no dropdown

---

## Pontos Positivos

- `lang="pt-BR"` presente no `<html>` raiz ✅
- Skip link implementado no header principal com CSS correto (.skip-nav) ✅
- `<main id="main-content">` presente no AppLayout ✅
- `prefers-reduced-motion` tratado globalmente no globals.css ✅
- Todos os elementos interativos com `focus-visible:ring-2` ✅
- Kanban usa `@dnd-kit/core` com `KeyboardSensor` para suporte a teclado ✅
- Modais usam `@radix-ui/react-dialog` (focus trap nativo) ✅
- Session timeout usa `role="alertdialog"` correto ✅
- `aria-current="page"` implementado nos links da sidebar ✅
- Live regions (`aria-live`, `role="alert"`, `role="status"`) bem implementadas ✅

---

## Conformidade WCAG 2.1 Final

### Level A
| Critério | Status |
|---|---|
| 1.1.1 Non-text Content | ✅ |
| 1.3.1 Info and Relationships | ✅ |
| 2.1.1 Keyboard | ✅ |
| 2.4.1 Bypass Blocks | ✅ |
| 4.1.2 Name, Role, Value | ✅ |

### Level AA
| Critério | Status |
|---|---|
| 1.4.3 Contrast (Minimum) | ✅ |
| 1.4.4 Resize Text | ✅ |
| 2.4.7 Focus Visible | ✅ |
| 3.1.1 Language of Page | ✅ |
| 4.1.3 Status Messages | ✅ |
