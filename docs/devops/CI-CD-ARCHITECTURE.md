# CI/CD Architecture — ProjectForge

> Gerado por module-18-devops-monitoring/TASK-0 | Rastreabilidade: INT-119, INT-120

## Visão Geral do Pipeline

```
Push/PR → main
   └─► ci.yml (GitHub Actions)
         ├─ lint-and-typecheck
         │     ├─ npm ci (cache node_modules)
         │     ├─ prisma generate
         │     ├─ eslint
         │     └─ tsc --noEmit
         ├─ build (needs: lint-and-typecheck)
         │     ├─ npm run build
         │     ├─ verify standalone output
         │     └─ check bundle size (scripts/check-bundle-size.js)
         ├─ test (needs: lint-and-typecheck)
         │     ├─ jest --ci --coverage --forceExit
         │     └─ codecov upload
         └─ docker-build (needs: lint-and-typecheck)
               └─ docker build (cache GHA)

PR → any branch (preview deploy via Vercel)
   └─► e2e.yml (disparado por deployment_status: success)
         └─ playwright test tests/e2e/smoke/ --project=chromium
               ├─ auth.spec.ts (login + redirect básico)
               └─ healthz.spec.ts (GET /api/healthz → 200)
```

## Ferramentas e Justificativas

| Camada | Ferramenta | Versão | Justificativa |
|--------|------------|--------|---------------|
| CI/CD | GitHub Actions | v4 | Nativo ao repositório, sem custo adicional para repos públicos |
| Deploy | Vercel | Integração nativa | Zero-config Next.js, preview URLs automáticas, region gru1 |
| Error tracking | Sentry | @sentry/nextjs | SDK Next.js nativo, source maps automáticos, 3 runtimes |
| Logging | Pino | ^8.x | JSON estruturado, alta performance, redact PII nativo |
| Analytics | Vercel Analytics + Speed Insights | @vercel/analytics | Core Web Vitals sem código de tracking extra |
| DB metrics | Prisma middleware ($use) | nativo | Query time logging sem overhead de biblioteca extra |
| E2E | Playwright | @playwright/test | Cross-browser, screenshot on failure, integração Vercel preview |
| Coverage | Codecov | codecov-action@v4 | Histórico de cobertura, PR comments |

## Fluxo de Push → main

```
1. Dev faz push para main (ou PR aprovado + merge)
2. GitHub Actions dispara ci.yml
3. Jobs paralelos: lint-and-typecheck + docker-build
4. Job build (após lint): next build + bundle check
5. Job test (após lint): jest --ci + codecov
6. Todos passam → Vercel detecta push → deploy de produção
7. Deploy conclui → e2e.yml NÃO roda (filtro: != 'Production')
8. Sentry release criado (getsentry/action-release)
```

## Fluxo de PR → preview

```
1. Dev abre PR para qualquer branch
2. GitHub Actions dispara ci.yml (em modo PR)
3. Vercel detecta PR → preview deploy automático
4. Preview URL comentada no PR automaticamente
5. Deploy conclui com status "success" → e2e.yml dispara
6. Playwright roda smoke tests na preview URL
7. Resultado dos E2E aparece como check no PR
```

## Configuração de Secrets Necessários

### GitHub Secrets (Settings → Secrets → Actions)

| Secret | Usado em | Obrigatório |
|--------|----------|-------------|
| `DATABASE_URL_TEST` | job test | Sim |
| `SUPABASE_URL_TEST` | job test | Sim |
| `SUPABASE_ANON_KEY_TEST` | job test | Sim |
| `SENTRY_DSN` | job build | Não (build passa sem ele) |
| `SENTRY_AUTH_TOKEN` | Sentry release | Não (source maps opcionais) |
| `SENTRY_ORG` | Sentry release | Não |
| `SENTRY_PROJECT` | Sentry release | Não |
| `CODECOV_TOKEN` | codecov upload | Não (falha silenciosa) |
| `E2E_TEST_USER_EMAIL` | e2e.yml | Sim (E2E) |
| `E2E_TEST_USER_PASSWORD` | e2e.yml | Sim (E2E) |

## Timeouts Configurados

| Job | Timeout | Justificativa |
|-----|---------|---------------|
| lint-and-typecheck | 10 min | Rápido — apenas análise estática |
| build | 15 min | Build Next.js standalone + bundle check |
| test | 10 min | Jest com --ci e --forceExit |
| docker-build | 20 min | Build Docker com cache GHA |
| E2E (e2e.yml) | 20 min | Playwright com download de browsers |

## Fallback: Vercel CLI vs Integração Nativa

O deploy utiliza a **integração nativa do Vercel** (conectar GitHub repo no dashboard).
Alternativa via Vercel CLI (caso a integração nativa falhe):

```yaml
- name: Deploy via Vercel CLI
  run: npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
  env:
    VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
    VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

Requer secrets adicionais: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
