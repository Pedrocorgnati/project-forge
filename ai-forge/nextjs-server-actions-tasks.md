# Server Actions — Task File
> Gerado por `/nextjs:server-actions` | 2026-03-23

## Status Final: CONCLUÍDO ✅

---

### T001 - Fix redirect dentro de try/catch em auth.ts

**Tipo:** SEQUENTIAL
**Dependências:** none
**Status:** ✅ COMPLETED
**Arquivo:** `src/actions/auth.ts`

**Problema:**
`signOut()` e `signInWithGithub()` chamavam `redirect()` dentro de `try/catch`.
`redirect()` em Next.js App Router lança uma exceção especial `NEXT_REDIRECT`.
Ao ser capturada pelo `catch (error) { return toActionError(error) }`, o redirect
nunca era executado — o usuário não era redirecionado após logout ou OAuth.

**Evidência:**
```bash
grep -n "redirect\|try\|catch" src/actions/auth.ts
# Antes: redirect('/login') na linha 29, dentro do bloco try (linhas 25-32)
# Antes: redirect(data.url) na linha 46, dentro do bloco try (linhas 38-52)
```

**Correção:**
- `signOut`: `revalidatePath` permanece no try; `redirect('/login')` movido para após o bloco try/catch
- `signInWithGithub`: URL salva em `oauthUrl` local dentro do try; `redirect(oauthUrl)` chamado após o bloco try/catch

**Critérios de Aceite:**
- [x] `redirect('/login')` em signOut fora do try/catch
- [x] `redirect(data.url)` em signInWithGithub fora do try/catch

---

### T002 - Rate limiting nas actions de auth sensíveis

**Tipo:** SEQUENTIAL
**Dependências:** T001
**Status:** ✅ COMPLETED
**Arquivo:** `src/actions/auth.ts`

**Problema:**
`signInWithEmail`, `verifyMFA` e `setupMFA` não usavam o utilitário
`src/lib/auth/rate-limit.ts` que já existia no projeto.

**Evidência:**
```bash
# rate-limit.ts existe mas não era importado em actions/auth.ts
grep -rn "checkRateLimit" src/actions/ --include="*.ts"
# (sem resultados antes da correção)
```

**Correção:**
- `signInWithEmail`: chave `signin:${ip}:${email}` via `headers()`. `recordFailedAttempt` em falha, `clearAttempts` em sucesso.
- `setupMFA`: chave `mfa-setup:${user.id}`. `recordFailedAttempt` em erro do Supabase.
- `verifyMFA`: chave `mfa-verify:${factorId}`. `recordFailedAttempt` em challenge ou verify error. `clearAttempts` em sucesso.

**Critérios de Aceite:**
- [x] `signInWithEmail`: bloqueia após tentativas falhas
- [x] `verifyMFA`: bloqueia após tentativas (key: `mfa-verify:${factorId}`)
- [x] `setupMFA`: bloqueia após tentativas (key: `mfa-setup:${userId}`)
- [x] `clearAttempts` chamado em login/verify bem-sucedido

---

### T003 - Zod schema em updateCostConfig

**Tipo:** SEQUENTIAL
**Dependências:** T001
**Status:** ✅ COMPLETED
**Arquivo:** `src/actions/cost-config.ts`

**Problema:**
`updateCostConfig` recebia `updates: { hourlyRate?: number; effectiveTo?: string }`
sem validação Zod. Usava verificação manual `Object.keys(data).length === 0`.

**Evidência:**
```bash
grep -n "Object.keys\|hourlyRate.*number\|effectiveTo.*string" src/actions/cost-config.ts
```

**Correção:**
Schema `UpdateCostConfigSchema` adicionado com:
- `hourlyRate`: `z.number().positive().max(10000).optional()`
- `effectiveTo`: `z.string().datetime().optional()`
- `.refine()` garantindo ao menos um campo

**Critérios de Aceite:**
- [x] Schema Zod inline para o objeto `updates`
- [x] `hourlyRate` validado como número positivo quando presente
- [x] `effectiveTo` validado como string ISO datetime quando presente
- [x] Pelo menos um campo obrigatório via `.refine()`

---

### T004 - Revalidar layout nas actions de notificação

**Tipo:** SEQUENTIAL
**Dependências:** T001
**Status:** ✅ COMPLETED
**Arquivo:** `src/actions/notifications.ts`

**Problema:**
`markNotificationRead` e `markAllNotificationsRead` revalidavam `/notificacoes`
mas não revalidavam o layout, deixando o badge de contagem desatualizado no nav.

**Evidência:**
```bash
grep -n "revalidatePath" src/actions/notifications.ts
# Antes: apenas revalidatePath('/notificacoes')
```

**Correção:**
Adicionado `revalidatePath('/', 'layout')` após `revalidatePath('/notificacoes')`
nas duas actions.

**Critérios de Aceite:**
- [x] `revalidatePath('/notificacoes')` presente
- [x] `revalidatePath('/', 'layout')` adicionado para atualizar badge no nav
