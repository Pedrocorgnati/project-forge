# Monitoring Spec — ProjectForge

> Rastreabilidade: INT-120, INT-122, INT-123

## Métricas-Chave e Thresholds

| Métrica | Threshold WARNING | Threshold ERROR | Ferramenta | Responsável |
|---------|-------------------|-----------------|------------|-------------|
| Error rate | > 1% das requests | > 5% das requests | Sentry | Automático |
| API latency (p95) | > 500ms | > 2000ms | Pino middleware | `src/lib/middleware/request-logger.ts` |
| DB query time | > 500ms | > 2000ms | Prisma `$use` middleware | `src/lib/db.ts` |
| Build size (main chunk) | > 180KB (gzip) | > 200KB (gzip) | check-bundle-size.js | CI step |
| Build size (por rota) | > 80KB (gzip) | > 100KB (gzip) | check-bundle-size.js | CI step |
| Core Web Vitals LCP | > 2.5s | > 4.0s | Vercel Analytics | Dashboard |
| Core Web Vitals INP | > 200ms | > 500ms | Vercel Analytics | Dashboard |
| Core Web Vitals CLS | > 0.1 | > 0.25 | Vercel Analytics | Dashboard |

## Alertas Sentry

### Regra 1: Novo Issue em Produção

```
Evento:    A new issue is created
Filtro:    environment = production
Ação:      Email para equipe (pedro@corgnati.com)
Frequência: Notify once per new issue
```

### Regra 2: Spike de Erros

```
Evento:    Number of events in an issue > 10 in 1 hour
Filtro:    environment = production
Ação:      Slack webhook → canal #alerts
Frequência: Every 30 minutes while issue continues
Fallback:  Se Slack webhook inválido → email como fallback mínimo
```

### Regra 3: Erro Não Tratado

```
Evento:    Issue changes state to Unresolved
Filtro:    level = fatal OR level = error, environment = production
Ação:      Email para equipe completa
Frequência: A cada regressão (resolve + unresolved)
```

## Alertas Vercel

| Evento | Ação automática | Configuração |
|--------|-----------------|--------------|
| Deploy failure | Email ao owner do projeto | Automático (nativo Vercel) |
| Build timeout | Email ao owner | Automático |
| Deploy success | Nenhuma | — |

## Configuração de Sentry por Runtime

| Runtime | Arquivo de config | tracesSampleRate (prod) | Observação |
|---------|-------------------|------------------------|------------|
| Client (browser) | `sentry.client.config.ts` | 0.1 (10%) | + Session Replay (10% normal, 100% erro) |
| Server (Node.js) | `sentry.server.config.ts` | 0.1 (10%) | sendDefaultPii: false |
| Edge | `sentry.edge.config.ts` | 0.05 (5%) | Menor sample — rotas Edge são críticas |

**Nota LGPD:** `maskAllText: true` no Session Replay garante que dados de formulários (incluindo PII) nunca aparecem nas gravações.

## Logging Estruturado (Pino)

### Níveis de Log por Ambiente

| Ambiente | LOG_LEVEL | O que é logado |
|----------|-----------|----------------|
| development | debug | Tudo (debug + info + warn + error) |
| staging | info | Requests + warnings + errors |
| production | warn | Apenas warnings e errors |

### Campos Obrigatórios em Todo Log

```json
{
  "level": 30,
  "time": 1711100000000,
  "env": "production",
  "version": "0.1.0",
  "module": "http",
  "msg": "Request"
}
```

### Campos Redactados Automaticamente

`password`, `token`, `authorization`, `cookie`, `req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.token` → substituídos por `[REDACTED]`.

## Bundle Size Budget

Script: `scripts/check-bundle-size.js`
Comando CI: `npm run bundle:check`

| Chunk | Limite (raw) | Ação ao exceder |
|-------|-------------|-----------------|
| Rotas individuais | 100KB | CI falha com exit code 1 |
| Investigação | — | `ANALYZE=true npm run build` → `analyze/client.html` |

## Referência ao Bundle Size Check

```yaml
# .github/workflows/ci.yml — step após "Build":
- name: Check bundle size
  run: npm run bundle:check
```

O script lê `.next/static/chunks/` e verifica o top-10 de chunks.
Se algum exceder 100KB, falha o CI com mensagem de diagnóstico.
