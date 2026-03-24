# Forms Tasks — ProjectForge

Gerado por: `/nextjs:forms .claude/projects/project-forge.json`
Data: 2026-03-24

---

### T001 — FormField não injeta `aria-describedby` no input filho ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/components/ui/form-field.tsx`

**Descrição:** `FormField` renderiza o erro com `id="${htmlFor}-error"` e o hint com `id="${htmlFor}-helper"`, mas nenhum dos inputs filhos recebe `aria-describedby` apontando para esses IDs. Screen readers não anunciam mensagens de erro. Fix: usar `React.cloneElement` para injetar `aria-describedby` no filho quando `htmlFor` + `error` ou `helper` estão presentes.

**Critérios de Aceite:**
- [ ] `aria-describedby` injetado automaticamente via `React.cloneElement`
- [ ] Aponta para `${htmlFor}-error` quando há erro, `${htmlFor}-helper` quando há helper
- [ ] Não quebra casos sem `htmlFor`

**Estimativa:** 0.5h

---

### T002 — `z.number({ error: ... })` usa API incorreta do Zod v3 ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/components/timesheet/LogHoursForm.tsx`

**Descrição:** `z.number({ error: 'Informe um número' })` usa a chave `error` que não existe no Zod v3. A chave correta é `invalid_type_error`. Como resultado, quando o usuário insere texto no campo de horas, nenhuma mensagem de erro é exibida.

**Critérios de Aceite:**
- [ ] `z.number({ error: ... })` → `z.number({ invalid_type_error: ... })`
- [ ] Mensagem aparece ao submeter horas com valor não-numérico

**Estimativa:** 0.1h

---

### T003 — `mode: 'onBlur'` ausente nos formulários críticos ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/app/(auth)/login/page.tsx`
- modificar: `src/app/(auth)/recuperar-senha/page.tsx`
- modificar: `src/app/(auth)/mfa/verify/page.tsx`
- modificar: `src/app/(auth)/mfa/setup/page.tsx`
- modificar: `src/app/(app)/configuracoes/_components/SegurancaTab.tsx`
- modificar: `src/app/(app)/configuracoes/_components/PerfilTab.tsx`

**Descrição:** `useForm()` sem `mode` valida apenas no submit. Formulários críticos (login, senha, MFA) devem validar ao sair do campo (`mode: 'onBlur'`) para UX mais responsiva. `reValidateMode: 'onChange'` já é o default e não precisa ser explicitado.

**Critérios de Aceite:**
- [ ] `{ resolver: ..., mode: 'onBlur' }` nos 6 arquivos listados
- [ ] Erros aparecem ao sair do campo sem preencher

**Estimativa:** 0.3h

---

### T004 — `CreateTaskModal` usa `useState` manual em vez de `formState.isSubmitting` ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/components/board/CreateTaskModal.tsx`

**Descrição:** O modal gerencia `isSubmitting` com `useState(false)` em vez de usar `formState.isSubmitting` do react-hook-form. Além disso, o botão de submit usa `onClick={handleSubmit(...)}` em vez de `type="submit"` dentro do form, o que duplica o handler e pode causar double-submit. O form já tem `onSubmit={handleSubmit(...)}` — o botão externo ao form (no `footer`) deve usar `form="..."` e `type="submit"`.

**Critérios de Aceite:**
- [ ] `const [isSubmitting, setIsSubmitting] = useState(false)` removido
- [ ] `formState: { errors, isSubmitting }` adicionado ao `useForm` destructuring
- [ ] `handleFormSubmit` simplificado (sem `setIsSubmitting`)
- [ ] Botão no footer usa `type="submit" form="create-task-form"` sem `onClick`
- [ ] Form recebe `id="create-task-form"`

**Estimativa:** 0.3h

---

### T005 — `InviteRegisterForm` reimplementa toggle de senha em vez de usar `PasswordInput` ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/components/auth/InviteRegisterForm.tsx`

**Descrição:** O formulário implementa manualmente o toggle de senha com `useState(showPassword)` e `<Eye>/<EyeOff>` para os campos de senha e confirmação, em vez de usar `PasswordInput` de `@/components/ui/input` que já implementa isso com `aria-label`, `aria-pressed` e `PasswordInput.displayName`. Também usa `Eye`/`EyeOff` importados separadamente — código duplicado.

**Critérios de Aceite:**
- [ ] `import { PasswordInput } from '@/components/ui/input'`
- [ ] Campos de senha e confirmação usam `<PasswordInput>` em vez de `<Input type={show ? 'text' : 'password'}>` + botão manual
- [ ] `showPassword`, `showConfirmPassword` states removidos
- [ ] `aria-describedby="password-strength"` mantido no campo de senha (via prop passthrough)

**Estimativa:** 0.3h

---

### T006 — `CreateProjectModal` usa `<select>` nativo em vez do componente `Select` ✅ COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Arquivos:**
- modificar: `src/components/projects/CreateProjectModal.tsx`

**Descrição:** O campo de moeda usa `<select>` HTML nativo com classes inline longas, sem `aria-invalid`, sem `error` prop e sem o ícone de chevron do componente `Select`. Inconsistente com os demais campos do form que usam `<Select>` de `@/components/ui/input`.

**Critérios de Aceite:**
- [ ] `<select>` substituído por `<Select>` com `options={CURRENCY_OPTIONS}`, `error={errors.currency?.message}`
- [ ] `aria-invalid` automático via componente
- [ ] Classes inline longas removidas

**Estimativa:** 0.1h

---
