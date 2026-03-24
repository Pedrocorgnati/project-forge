# nextjs-scalability-report.md

Gerado por: `/nextjs:scalability`
Data: 2026-03-24

---

## Status das Tasks

| Task | Título | Prioridade | Status |
|------|--------|------------|--------|
| T001 | Timeout em fetch externo: resend.ts | CRÍTICA | ✅ COMPLETED |
| T002 | Timeout em apiClient: utils/api.ts | ALTA | ✅ COMPLETED |
| T003 | Timeout em GitHub fetcher: rag/github-fetcher.ts | ALTA | ✅ COMPLETED |
| T004 | Health check sem verificação de dependências | MÉDIA | ✅ COMPLETED |

---

## Evidências de execução

### T001 — resend.ts
**Antes:** `fetch('https://api.resend.com/emails', { method: 'POST', headers: ... })`
**Depois:** `fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10_000), headers: ... })`
Timeout de 10s — alinhado com janela de função serverless (Vercel: 10s default).

### T002 — api.ts (apiClient)
**Antes:** `fetch(url, { ...options, headers: ... })`
**Depois:** `fetch(url, { ...options, signal: options.signal ?? AbortSignal.timeout(30_000), headers: ... })`
`options.signal` externo tem precedência — callers que já passam AbortController próprio não são afetados.

### T003 — github-fetcher.ts
**Antes:** `fetch(url, { headers })`
**Depois:** `fetch(url, { headers, signal: AbortSignal.timeout(30_000) })`
`GitHubApiUnreachableError` continua capturando erros de rede, inclusive `AbortError`.

### T004 — health/route.ts
**Antes:** Retornava `{ status: 'ok' }` incondicionalmente.
**Depois:** Executa `prisma.$queryRaw\`SELECT 1\`` com race contra timeout de 3s.
- `status: 'ok'` + `checks.database.latencyMs` quando DB responde.
- `status: 'degraded'` (HTTP 200) quando DB não responde — não derruba liveness.

---

## Itens descartados (não-problema)

| Item | Razão |
|------|-------|
| `projectCategory` sem `organizationId` | Dado de referência global; RLS tem `public_read_project_category`. Intencional. |
| Rate-limit Maps em memória | Single-instance. Risco documentado para quando horizontal scaling for necessário. |
| Connection pooling | PgBouncer via Supabase URL (`?pgbouncer=true`). Pool gerenciado externamente. |
| `$executeRaw` | Todos usam template literal parameterizado. Sem VALUES CTE ou UNNEST não tipado. |
| Promise.all com writes | Sem evidência de bulk writes que saturem o pool (≤10 items em paths auditados). |

---

## Métricas

- Fetches externos sem timeout: **3 → 0**
- Health checks com verificação de DB: **0 → 1**
- Tasks executadas: **4/4**
