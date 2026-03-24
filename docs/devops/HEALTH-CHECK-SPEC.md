# Health Check Endpoint Spec — ProjectForge

> Rastreabilidade: INT-121, INT-123 | Implementado em: src/app/api/healthz/route.ts

## Contrato do Endpoint

```
GET /api/healthz
Cache-Control: no-store, no-cache, must-revalidate
Runtime: nodejs (não Edge — requer Prisma)
```

### Resposta 200 — Estado Saudável

```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-03-22T10:30:00.000Z",
  "env": "production",
  "db": "connected",
  "responseTime": "12ms"
}
```

### Resposta 503 — Estado Degradado

```json
{
  "status": "degraded",
  "version": "0.1.0",
  "timestamp": "2026-03-22T10:30:00.000Z",
  "env": "production",
  "db": "disconnected",
  "responseTime": "30001ms",
  "dbError": "Connection timeout"
}
```

## Schema de Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `status` | `"ok" \| "degraded"` | Sim | Estado geral do serviço |
| `version` | `string` | Sim | `npm_package_version` ou `"0.0.0"` como fallback |
| `timestamp` | `string` (ISO-8601) | Sim | Momento da verificação |
| `env` | `string` | Sim | `NODE_ENV` |
| `db` | `"connected" \| "disconnected"` | Sim | Estado do PostgreSQL via Prisma `SELECT 1` |
| `responseTime` | `string` (ex: `"12ms"`) | Sim | Tempo de resposta da probe completa |
| `dbError` | `string` | Não | Mensagem de erro quando `db = "disconnected"` |

## Comportamentos

### Probe de DB

A verificação de banco utiliza `prisma.$queryRaw\`SELECT 1\`` via `src/lib/db.ts`.

- **Sucesso:** retorna `db: "connected"`, HTTP 200
- **Timeout/Erro:** retorna `db: "disconnected"`, HTTP 503, campo `dbError` com mensagem

### Fallback de versão

`process.env.npm_package_version` não está disponível em ambientes Vercel serverless.
O endpoint usa `?? '0.0.0'` como fallback — nunca quebra o endpoint.

### Cache

O header `Cache-Control: no-store, no-cache, must-revalidate` garante que:
- Vercel Edge Cache não armazena a resposta
- CDNs não cacheiam o estado de saúde
- Cada chamada reflete o estado atual do sistema

### Runtime

```typescript
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
```

`runtime: 'nodejs'` é obrigatório — Prisma não é compatível com Edge runtime.

## Uso em Smoke Tests

```bash
# Verificação manual pós-deploy:
curl -s https://projectforge.vercel.app/api/healthz | jq .

# Script automatizado:
./scripts/smoke-test.sh https://projectforge.vercel.app
```

## Monitoramento Externo (Opcional)

Ferramentas como UptimeRobot ou Checkly podem monitorar este endpoint:

```
URL: https://projectforge.vercel.app/api/healthz
Método: GET
Intervalo: 5 minutos
Alerta em: status != "ok" OU HTTP != 200
Timeout: 10 segundos
```
