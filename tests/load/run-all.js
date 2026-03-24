// tests/load/run-all.js
// Orquestrador de testes de carga — ProjectForge
//
// IMPORTANTE: Este arquivo orquestra TODOS os cenários em sequência.
// Para cenários individuais, execute diretamente o arquivo do cenário.
//
// Uso rápido:
//   npm run test:load:smoke     — smoke test (1 VU, 1 min, apenas health-check)
//   npm run test:load           — carga normal (todos os cenários sequenciais)
//   npm run test:load:stress    — stress test
//
// Uso manual com k6:
//   k6 run tests/load/run-all.js
//   k6 run --env SCENARIO=smoke tests/load/run-all.js
//   k6 run --env SCENARIO=stress tests/load/run-all.js
//
// Variáveis de ambiente necessárias (adicionar ao .env.local):
//   BASE_URL          = http://localhost:3000/api
//   SUPABASE_URL      = https://<project>.supabase.co
//   SUPABASE_ANON_KEY = <anon-key>
//   LOAD_TEST_USER    = loadtest@projectforge.local
//   LOAD_TEST_PASS    = LoadTest@123
//   LOAD_TEST_PROJECT_ID = <uuid-de-projeto-com-dados>
//
// Integração CI/CD:
//   k6 retorna exit code não-zero quando thresholds são violados.
//   Use /ci-cd-create para integrar como gate de performance no pipeline.
//   Exemplo: k6 run --env SCENARIO=smoke tests/load/run-all.js || exit 1

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api'
const SUPABASE_URL = __ENV.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || ''
const LOAD_TEST_USER = __ENV.LOAD_TEST_USER || 'loadtest@projectforge.local'
const LOAD_TEST_PASS = __ENV.LOAD_TEST_PASS || 'LoadTest@123'
const LOAD_TEST_PROJECT_ID = __ENV.LOAD_TEST_PROJECT_ID || 'PROJECT_ID_PLACEHOLDER'
const SCENARIO = __ENV.SCENARIO || 'smoke'

// Métricas por cenário
const errorRate = new Rate('errors')
const healthLatency = new Trend('health_latency')
const authLatency = new Trend('auth_latency')
const projectsLatency = new Trend('projects_latency')
const notificationsLatency = new Trend('notifications_latency')

// SLOs por cenário (fonte: slos.json)
const SLO = {
  health:        { p95: 200,  p99: 500 },
  auth:          { p95: 500,  p99: 1000 },
  projects:      { p95: 500,  p99: 1000 },
  notifications: { p95: 500,  p99: 1000 },
}

const scenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '1m',
  },
  average_load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20 },
      { duration: '5m', target: 20 },
      { duration: '2m', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 0 },
    ],
  },
}

export const options = {
  scenarios: {
    [SCENARIO]: scenarios[SCENARIO] || scenarios.smoke,
  },
  thresholds: {
    // Thresholds globais — mais restritivos que por-cenário para forçar validação
    'http_req_duration{scenario:health}':        [`p(95)<${SLO.health.p95}`],
    'http_req_duration{scenario:auth}':          [`p(95)<${SLO.auth.p95}`],
    'http_req_duration{scenario:projects}':      [`p(95)<${SLO.projects.p95}`],
    'http_req_duration{scenario:notifications}': [`p(95)<${SLO.notifications.p95}`],
    errors: ['rate<0.01'],
    http_req_failed: ['rate<0.05'],
  },
  tags: {
    commit: __ENV.COMMIT_SHA || 'local',
  },
}

export function setup() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Variáveis Supabase não configuradas. Cenários autenticados retornarão 401.')
    return { token: null }
  }

  const authRes = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: LOAD_TEST_USER, password: LOAD_TEST_PASS }),
    { headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY } }
  )

  if (authRes.status !== 200) {
    console.error(`Login falhou: ${authRes.status} — ${authRes.body}`)
    return { token: null }
  }

  console.log(`Token obtido para ${LOAD_TEST_USER}`)
  return { token: JSON.parse(authRes.body).access_token }
}

export default function (data) {
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(data.token ? { Authorization: `Bearer ${data.token}` } : {}),
  }

  // ─────────────────────────────────────────
  // Cenário 1: Health Check
  // ─────────────────────────────────────────
  group('health', () => {
    const res = http.get(`${BASE_URL}/health`, {
      tags: { scenario: 'health' },
    })
    healthLatency.add(res.timings.duration)
    check(res, { 'health 200': (r) => r.status === 200 }) || errorRate.add(1)
    errorRate.add(res.status !== 200)
  })

  sleep(0.5)

  // ─────────────────────────────────────────
  // Cenário 2: Auth /me
  // ─────────────────────────────────────────
  group('auth', () => {
    const res = http.get(`${BASE_URL}/auth/me`, {
      headers: authHeaders,
      tags: { scenario: 'auth' },
    })
    authLatency.add(res.timings.duration)
    errorRate.add(res.status !== 200)
  })

  sleep(0.5)

  // ─────────────────────────────────────────
  // Cenário 3: Listagem de Projetos
  // ─────────────────────────────────────────
  group('projects', () => {
    const res = http.get(`${BASE_URL}/projects`, {
      headers: authHeaders,
      tags: { scenario: 'projects' },
    })
    projectsLatency.add(res.timings.duration)
    errorRate.add(res.status !== 200)
  })

  sleep(0.5)

  // ─────────────────────────────────────────
  // Cenário 4: Notificações
  // ─────────────────────────────────────────
  group('notifications', () => {
    const res = http.get(`${BASE_URL}/notifications`, {
      headers: authHeaders,
      tags: { scenario: 'notifications' },
    })
    notificationsLatency.add(res.timings.duration)
    errorRate.add(res.status !== 200)
  })

  sleep(1)
}

// Salva resumo em JSON para histórico
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return {
    'tests/load/results/summary-latest.json': JSON.stringify(data, null, 2),
    [`tests/load/results/summary-${timestamp}.json`]: JSON.stringify(data, null, 2),
  }
}
