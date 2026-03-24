# Accessibility Tasks — Project Forge
_Gerado por /nextjs:accessibility em 2026-03-23_

---

### T001 - Adicionar `aria-hidden` ao ícone decorativo de NavItem na Sidebar

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `src/components/layout/sidebar.tsx`

**Descrição:**
O componente NavItem renderiza `<Icon size={20} className="shrink-0" />` sem `aria-hidden="true"`.
Screen readers anunciam nomes de ícones (ex: "Home", "FolderOpen", "BarChart2") redundantemente ao
lado do texto de label que já está presente. Adicionar `aria-hidden="true"` ao `<Icon>`.

**WCAG:** 1.1.1, 1.3.1

**Critérios de Aceite:**
- [ ] `<Icon aria-hidden="true" size={20} className="shrink-0" />` em NavItem
- [ ] Screen reader anuncia apenas o texto do link (ex: "Dashboard — página atual")
- [ ] Nenhuma alteração visual

**Estimativa:** 0.1h

---

### T002 - Adicionar `<main id="main-content">` ao layout de autenticação

**Tipo:** SEQUENTIAL
**Dependências:** T001
**Arquivos:**
- modificar: `src/app/(auth)/layout.tsx`

**Descrição:**
O AuthLayout usa apenas `<div>` containers — sem landmark `<main>`. Páginas de auth (login,
recuperar-senha, invite/[token], mfa/verify, mfa/setup) ficam sem região principal semântica.
Substituir `<div className="w-full max-w-md">` por `<main id="main-content">`.

**WCAG:** 1.3.1, 2.4.1

**Critérios de Aceite:**
- [ ] AuthLayout renderiza `<main id="main-content" ...>` wrapping children
- [ ] Todas as 5 páginas de auth têm landmark `<main>`
- [ ] Skip link funcional nas páginas de auth
- [ ] Layout visual idêntico

**Estimativa:** 0.1h

---

### T003 - Adicionar `id="main-content"` ao `<main>` dos layouts do portal

**Tipo:** SEQUENTIAL
**Dependências:** T002
**Arquivos:**
- modificar: `src/app/portal/dashboard/layout.tsx`
- modificar: `src/app/portal/approvals/layout.tsx`

**Descrição:**
`PortalDashboardLayout` e `PortalApprovalsLayout` têm `<main>` mas sem `id`. O `PortalHeader`
não tem skip link, então usuários de teclado ficam sem atalho para o conteúdo principal.
Adicionar `id="main-content"` e `tabIndex={-1}` ao `<main>` em ambos os layouts.
Também adicionar skip link ao `PortalHeader`.

**WCAG:** 2.4.1

**Critérios de Aceite:**
- [ ] `<main id="main-content" tabIndex={-1}>` em portal/dashboard/layout.tsx
- [ ] `<main id="main-content" tabIndex={-1}>` em portal/approvals/layout.tsx
- [ ] PortalHeader contém skip link `<a href="#main-content">Pular para conteúdo</a>`
- [ ] Skip link visível ao receber foco (mesmo estilo de .skip-nav do globals.css)

**Estimativa:** 0.2h

---

### T004 - Adicionar `aria-hidden` ao ícone `<Bell>` no NotificationBell

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/components/notifications/notification-bell.tsx`

**Descrição:**
`<Bell className="h-5 w-5" />` não tem `aria-hidden="true"`. O botão já tem `aria-label` descritivo,
então o ícone é puramente decorativo e deve ser ocultado de screen readers.

**WCAG:** 1.1.1

**Critérios de Aceite:**
- [ ] `<Bell className="h-5 w-5" aria-hidden="true" />`
- [ ] Screen reader anuncia apenas o aria-label do botão

**Estimativa:** 0.05h

---

### T005 - Adicionar `aria-hidden` ao ícone `<LogOut>` no PortalHeader

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/components/portal/portal-header.tsx`

**Descrição:**
`<LogOut className="h-4 w-4 mr-1" />` dentro do botão "Sair" não tem `aria-hidden="true"`.
O texto "Sair" já descreve a ação; o ícone é decorativo.

**WCAG:** 1.1.1

**Critérios de Aceite:**
- [ ] `<LogOut className="h-4 w-4 mr-1" aria-hidden="true" />`
- [ ] Screen reader anuncia "Sair, botão"

**Estimativa:** 0.05h

---

### T006 - Adicionar `aria-hidden` aos ícones `<Check>` e `<Copy>` no MFA setup

**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/app/(auth)/mfa/setup/page.tsx`

**Descrição:**
Botões de cópia na página MFA setup (`manualSecret` e `recoveryCodes`) exibem `<Check>` e `<Copy>`
sem `aria-hidden`. O texto do código dentro do botão já é o label; os ícones são status visuais
decorativos e devem ser ocultos de screen readers.

Linhas afetadas: 156, 157, 204, 205.

**WCAG:** 1.1.1

**Critérios de Aceite:**
- [ ] Todos os 4 ícones (2x Check + 2x Copy) têm `aria-hidden="true"`
- [ ] Screen reader anuncia apenas o texto do código

**Estimativa:** 0.1h

---

### T007 - Adicionar `aria-modal` e `aria-labelledby` ao dropdown de notificações

**Tipo:** SEQUENTIAL
**Dependências:** T004
**Arquivos:**
- modificar: `src/components/notifications/notification-list.tsx`

**Descrição:**
O `NotificationList` usa `role="dialog"` mas sem `aria-modal="true"`. Sem `aria-modal`, screen
readers continuam lendo o conteúdo por trás do dropdown. Adicionar `aria-modal="true"` em ambos
os estados (loading e normal) e conectar o `<h3>` via `aria-labelledby` em vez de `aria-label`.

**WCAG:** 4.1.2

**Critérios de Aceite:**
- [ ] Ambos os `role="dialog"` divs têm `aria-modal="true"`
- [ ] `<h3 id="notification-list-title">Notificações</h3>`
- [ ] `aria-labelledby="notification-list-title"` nos divs do estado normal
- [ ] Loading state mantém `aria-label="Notificações"` (sem h3 visível)

**Estimativa:** 0.2h

---

### T008 - Adicionar `aria-controls` ao botão de user menu no Header

**Tipo:** SEQUENTIAL
**Dependências:** none
**Arquivos:**
- modificar: `src/components/layout/header.tsx`

**Descrição:**
O botão user menu tem `aria-expanded={userMenuOpen}` mas sem `aria-controls`. Adicionar `id` ao
dropdown e `aria-controls` apontando para esse id no botão trigger.

**WCAG:** 4.1.2

**Critérios de Aceite:**
- [ ] Dropdown tem `id="user-menu-dropdown"`
- [ ] Botão trigger tem `aria-controls="user-menu-dropdown"`
- [ ] `aria-expanded` continua sincronizado com o estado

**Estimativa:** 0.1h

---

## Ordem de Execução

1. **T001** (SEQUENTIAL) — Sidebar icon aria-hidden
2. **T002** (SEQUENTIAL) — Auth layout `<main>`
3. **T003** (SEQUENTIAL) — Portal layouts `id="main-content"`
4. **T004-T006** (PARALLEL-GROUP-1) — Bell, LogOut, Check/Copy aria-hidden
5. **T007** (SEQUENTIAL) — Notification dialog aria-modal
6. **T008** (SEQUENTIAL) — User menu aria-controls

**Total estimado: ~0.85h**
