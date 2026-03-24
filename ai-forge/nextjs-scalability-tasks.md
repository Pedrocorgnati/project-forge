# nextjs-scalability-tasks.md

Gerado por: `/nextjs:scalability`
Config: `.claude/projects/project-forge.json`
Data: 2026-03-24

---

## Notas da Phase 1

### Itens revisados como não-problema

| Item | Razão |
|------|-------|
| `projectCategory.findMany()` sem `organizationId` | `ProjectCategory` é dado de referência global — RLS tem policy `public_read_project_category`. Sem tenant-scope intencional. |
| Rate-limit Maps em memória | App roda em instância única (Vercel/Next.js); sem evidência de multi-instance horizontal. Anotado como risco futuro, sem task ativa. |
| Connection pooling | `DATABASE_URL` usa PgBouncer via Supabase (`?pgbouncer=true`). Pool gerenciado externamente. |
| `$executeRaw` / `$executeRawUnsafe` | Usos auditados: todos usam template literal parameterizado (pg_notify, pgvector). Sem VALUES CTE ou UNNEST não tipado. |
| Promise.all com writes | Sem evidência de bulk writes que saturem o pool. |

---

## Tasks

### T001 — Timeout em fetch externo: resend.ts

**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Prioridade:** CRÍTICA
**Arquivos:**
- modificar: `src/lib/email/resend.ts`

**Descrição:**
`fetch('https://api.resend.com/emails', ...)` na linha 29 não tem timeout nem AbortController.
Se a API Resend estiver lenta ou fora do ar, o servidor bloqueia indefinidamente o request.
Em produção isso causa cascata: a route de convite trava, o slot de worker fica preso e
o container pode atingir o timeout de plataforma (Vercel: 10s/60s) com stack pouco informativo.

**Critérios de Aceite:**
- [ ] Timeout de 10s via `AbortSignal.timeout(10_000)` adicionado
- [ ] Build sem erros

---

### T002 — Timeout em apiClient: utils/api.ts

**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Prioridade:** ALTA
**Arquivos:**
- modificar: `src/lib/utils/api.ts`

**Descrição:**
`apiClient` é o cliente HTTP central do front-end. Não tem timeout configurado.
Se qualquer rota do próprio servidor demorar (ex: DB lento), o cliente fica
pendurado sem feedback para o usuário. Adicionar timeout default de 30s com
suporte a override via `signal` na `options`.

**Critérios de Aceite:**
- [ ] Timeout padrão de 30s aplicado via `AbortSignal.timeout(30_000)`
- [ ] `options.signal` externo tem precedência (não quebra callers que passam `signal`)
- [ ] Build sem erros

---

### T003 — Timeout em GitHub fetcher: rag/github-fetcher.ts

**Status:** COMPLETED
**Tipo:** PARALLEL-GROUP-1
**Dependências:** none
**Prioridade:** ALTA
**Arquivos:**
- modificar: `src/lib/rag/github-fetcher.ts`

**Descrição:**
`fetchWithRateLimit` faz `fetch(url, { headers })` sem timeout na linha 228.
Quando o GitHub responde com `Retry-After`, o código já aguarda o delay via `setTimeout` antes
de re-tentar — correto. Porém, o próprio `fetch` pode travar se a TCP connection ficar aberta
mas sem dados. Adicionar `AbortSignal.timeout(30_000)` ao fetch inicial.

**Critérios de Aceite:**
- [ ] Timeout de 30s aplicado ao `fetch` dentro de `fetchWithRateLimit`
- [ ] `GitHubApiUnreachableError` continua capturando erros de rede (incluindo AbortError)
- [ ] Build sem erros

---

### T004 — Health check sem verificação de dependências

**Status:** COMPLETED
**Tipo:** SEQUENTIAL
**Dependências:** none
**Prioridade:** MÉDIA
**Arquivos:**
- modificar: `src/app/api/health/route.ts`

**Descrição:**
`/api/health` retorna sempre `{ status: 'ok' }` independente do estado do banco.
Load balancers e ferramentas de monitoramento confiam neste endpoint para decidir
se a instância está pronta. Sem checar o DB, instâncias com DB inacessível recebem
tráfego indevido. Adicionar ping Prisma com timeout; degradar para `status: 'degraded'`
se falhar (não `500`, para não derrubar alertas de liveness).

**Critérios de Aceite:**
- [ ] `prisma.$queryRaw\`SELECT 1\`` executado com timeout de 3s
- [ ] `status: 'degraded'` retornado (HTTP 200) se DB não responder
- [ ] `status: 'ok'` mantido quando DB estiver saudável
- [ ] `checks.database` no body com latência e status
- [ ] Build sem erros
